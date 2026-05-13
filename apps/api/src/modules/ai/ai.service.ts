import { randomUUID } from "node:crypto";

import { GoogleGenAI, Type, createPartFromFunctionResponse, createUserContent } from "@google/genai";
import type { Content, FunctionCall, FunctionDeclaration, Part } from "@google/genai";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AiMessageRole, AiSessionChannel, BodyShape, Prisma, ProductCategory, ProductStatus } from "@prisma/client";

import { CompanyKnowledgeService } from "../knowledge/knowledge.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AiRecommendationDto } from "./dto/ai-recommendation.dto";
import {
  composeGroundedRecommendationText,
  selectDiverseProductCards,
  selectGroundedProducts,
  type GroundedKnowledgeEntryCard,
  type GroundedProductCard,
  type GroundedUserProfileContext
} from "./ai-response.utils";

type ProductCard = GroundedProductCard;

type KnowledgeEntryCard = GroundedKnowledgeEntryCard;

interface RecommendationResult {
  recommendationText: string;
  products: ProductCard[];
  knowledgeEntries: KnowledgeEntryCard[];
  context: {
    usedStoredMeasurements: boolean;
  };
}

interface ConversationTurn {
  role: "user" | "agent";
  text: string;
}

interface AiAgentEvent {
  type: "tool_call" | "tool_result";
  tool: string;
  payload: unknown;
}

interface RecommendOptions {
  channel?: "REST" | "WS";
  onEvent?: (event: AiAgentEvent) => void;
}

type UserProfileContext = GroundedUserProfileContext;
type GroundedRecommendationContext = {
  prompt: string;
  filters: Record<string, unknown> | null;
  profile: UserProfileContext;
  usedStoredMeasurements: boolean;
};

type ParsedSearchFilters = {
  category?: ProductCategory;
  size?: string;
  color?: string;
  bodyShape?: BodyShape;
  designerQuery?: string;
  minPrice?: number;
  maxPrice?: number;
  limit: number;
};

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    images: true;
    variants: true;
    designer: {
      select: {
        storeName: true;
        slug: true;
      };
    };
  };
}>;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly modelRetryDelaysMs = [350, 900];
  private readonly gemini: GoogleGenAI;
  private readonly modelName: string;
  private readonly functionDeclarations: FunctionDeclaration[] = [
    {
      name: "getUserProfile",
      description:
        "Retrieve the logged-in user's profile including body measurements and preference data.",
      parameters: {
        type: Type.OBJECT,
        properties: {},
        required: []
      }
    },
    {
      name: "searchProducts",
      description:
        "Search active products in the catalog using optional filters for category, size, color, price range, and designer/store name.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, enum: ["SUIT", "DRESS"] },
          size: { type: Type.STRING },
          color: { type: Type.STRING },
          designerQuery: { type: Type.STRING },
          bodyShape: {
            type: Type.STRING,
            enum: ["HOURGLASS", "PEAR", "APPLE", "RECTANGLE", "INVERTED_TRIANGLE", "ATHLETIC"]
          },
          minPrice: { type: Type.NUMBER },
          maxPrice: { type: Type.NUMBER },
          limit: { type: Type.INTEGER }
        },
        required: []
      }
    },
    {
      name: "searchCompanyKnowledge",
      description:
        "Search approved company knowledge for questions about Drapeon policies, designer onboarding, subscriptions, fittings, returns, and how the platform works.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING },
          limit: { type: Type.INTEGER }
        },
        required: ["query"]
      }
    },
    {
      name: "getProductDetails",
      description: "Retrieve full details for one product by id.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING }
        },
        required: ["id"]
      }
    }
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly companyKnowledgeService: CompanyKnowledgeService
  ) {
    this.gemini = new GoogleGenAI({
      apiKey: this.configService.getOrThrow<string>("GEMINI_API_KEY")
    });
    this.modelName = this.configService.get<string>("GEMINI_MODEL", "gemini-3-flash-preview");
  }

  async recommend(
    userId: string | null | undefined,
    payload: AiRecommendationDto,
    options: RecommendOptions = {}
  ): Promise<RecommendationResult> {
    const userProfile = await this.getUserProfileContext(
      userId,
      this.toRecord(payload.measurements)
    );
    const groundedContext = this.buildGroundedContext(payload, userProfile);
    const prompt = this.buildPrompt(payload, userProfile);
    const contents: Content[] = [createUserContent(prompt)];
    const collectedCards = new Map<string, ProductCard>();
    const collectedKnowledge = new Map<string, KnowledgeEntryCard>();
    const session = await this.prisma.aiSession.create({
      data: {
        userId: userId ?? null,
        channel: options.channel === "WS" ? AiSessionChannel.WS : AiSessionChannel.REST,
        contextSnapshot: {
          prompt: payload.prompt,
          filters: (this.toRecord(payload.filters) ?? null) as Prisma.InputJsonValue | null,
          usedOverrideMeasurements: payload.measurements != null
        } as Prisma.InputJsonValue
      }
    });

    await this.logAiMessage(session.id, {
      role: AiMessageRole.USER,
      content: payload.prompt
    });

    try {
      for (let turn = 0; turn < 6; turn += 1) {
        const response = await this.generateContentWithRetry(contents);
        const modelContent = response.candidates?.[0]?.content;

        if (modelContent) {
          contents.push(modelContent);
        }

        const functionCalls = response.functionCalls ?? [];

        if (functionCalls.length === 0) {
          return this.finalizeRecommendation(
            session.id,
            groundedContext,
            collectedCards,
            collectedKnowledge,
            payload
          );
        }

        const toolResponseParts: Part[] = [];

        for (const functionCall of functionCalls) {
          const part = await this.executeFunctionCall(
            userId,
            functionCall,
            collectedCards,
            collectedKnowledge,
            options.onEvent,
            session.id
          );
          toolResponseParts.push(part);
        }

        contents.push(createUserContent(toolResponseParts));
      }

      return this.finalizeRecommendation(
        session.id,
        groundedContext,
        collectedCards,
        collectedKnowledge,
        payload
      );
    } catch (error) {
      if (this.isTransientModelError(error)) {
        this.logger.warn(
          `Gemini was unavailable for model ${this.modelName}. Falling back to grounded catalog response.`
        );
        return this.buildModelAvailabilityFallback(
          session.id,
          payload,
          groundedContext,
          collectedCards,
          collectedKnowledge
        );
      }

      throw error;
    } finally {
      await this.prisma.aiSession.update({
        where: { id: session.id },
        data: { endedAt: new Date() }
      });
    }
  }

  private async executeFunctionCall(
    userId: string | null | undefined,
    functionCall: FunctionCall,
    collectedCards: Map<string, ProductCard>,
    collectedKnowledge: Map<string, KnowledgeEntryCard>,
    onEvent?: (event: AiAgentEvent) => void,
    sessionId?: string
  ): Promise<Part> {
    const functionId = functionCall.id ?? randomUUID();
    const name = functionCall.name ?? "";
    const args = functionCall.args ?? {};

    onEvent?.({
      type: "tool_call",
      tool: name,
      payload: args
    });

    if (sessionId) {
      await this.logAiMessage(sessionId, {
        role: AiMessageRole.TOOL,
        content: `Tool call: ${name}`,
        toolName: name,
        toolInput: args
      });
    }

    try {
      let responsePayload: Record<string, unknown>;

      if (name === "getUserProfile") {
        responsePayload = {
          output: await this.getUserProfileContext(userId)
        };
      } else if (name === "searchProducts") {
        const result = await this.searchProductsTool(args);
        for (const item of result.items) {
          collectedCards.set(item.id, item);
        }
        responsePayload = { output: result };
      } else if (name === "searchCompanyKnowledge") {
        const result = await this.searchCompanyKnowledgeTool(args);
        for (const item of result.items) {
          collectedKnowledge.set(item.id, item);
        }
        responsePayload = { output: result };
      } else if (name === "getProductDetails") {
        const result = await this.getProductDetailsTool(args);
        if (result.card) {
          collectedCards.set(result.card.id, result.card);
        }
        responsePayload = { output: result };
      } else {
        responsePayload = {
          error: `Unknown function call: ${name}`
        };
      }

      onEvent?.({
        type: "tool_result",
        tool: name,
        payload: responsePayload
      });

      if (sessionId) {
        await this.logAiMessage(sessionId, {
          role: AiMessageRole.TOOL,
          content: `Tool result: ${name}`,
          toolName: name,
          toolOutput: responsePayload
        });
      }

      return createPartFromFunctionResponse(functionId, name, responsePayload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown tool execution error";
      this.logger.error(`Tool execution failed for ${name}`, error instanceof Error ? error.stack : undefined);

      if (sessionId) {
        await this.logAiMessage(sessionId, {
          role: AiMessageRole.TOOL,
          content: `Tool error: ${name} - ${message}`,
          toolName: name,
          toolInput: args,
          toolOutput: { error: message }
        });
      }

      return createPartFromFunctionResponse(functionId, name, {
        error: message
      });
    }
  }

  private async getUserProfileContext(
    userId: string | null | undefined,
    overrideMeasurements?: Record<string, unknown>
  ): Promise<UserProfileContext> {
    if (!userId) {
      return {
        firstName: null,
        measurements: overrideMeasurements ?? null,
        preferences: null
      };
    }

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: {
        measurements: true
      }
    });

    return {
      firstName: profile?.firstName ?? null,
      measurements: overrideMeasurements ?? this.toRecord(profile?.measurements) ?? null,
      preferences: this.toRecord(profile?.preferences) ?? null
    };
  }

  private async searchProductsTool(args: Record<string, unknown>) {
    const filters = this.parseSearchFilters(args);
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.minPrice != null || filters.maxPrice != null
        ? {
            rentalPrice: {
              ...(filters.minPrice != null ? { gte: new Prisma.Decimal(filters.minPrice) } : {}),
              ...(filters.maxPrice != null ? { lte: new Prisma.Decimal(filters.maxPrice) } : {})
            }
          }
        : {}),
      ...(filters.bodyShape ? { bodyShapes: { has: filters.bodyShape } } : {}),
      ...(filters.designerQuery
        ? {
            designer: {
              storeName: {
                contains: filters.designerQuery,
                mode: "insensitive"
              }
            }
          }
        : {}),
      variants: {
        some: {
          isActive: true,
          ...(filters.size ? { sizeLabel: filters.size } : {}),
          ...(filters.color ? { color: filters.color } : {})
        }
      }
    };
    const fetchTake = Math.min(Math.max(filters.limit * 4, 12), 36);
    const products: ProductWithRelations[] = await this.prisma.product.findMany({
      where,
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1
        },
        variants: {
          where: { isActive: true },
          orderBy: [{ sizeLabel: "asc" }, { color: "asc" }]
        },
        designer: {
          select: {
            storeName: true,
            slug: true
          }
        }
      },
      take: fetchTake
    });
    const cards = products.map((product) => this.toProductCard(product));

    return {
      items: selectDiverseProductCards(cards, filters.limit)
    };
  }

  private async searchCompanyKnowledgeTool(args: Record<string, unknown>) {
    const query = typeof args.query === "string" ? args.query.trim() : "";
    const limit =
      typeof args.limit === "number" && Number.isInteger(args.limit) && args.limit > 0
        ? Math.min(args.limit, 6)
        : 4;

    if (!query) {
      throw new Error("Missing required knowledge search query");
    }

    const items = await this.companyKnowledgeService.searchKnowledge(query, limit);

    return {
      items: items.map((item) => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
        category: item.category,
        tags: item.tags
      }))
    };
  }

  private async getProductDetailsTool(args: Record<string, unknown>) {
    const productId = typeof args.id === "string" ? args.id : null;

    if (!productId) {
      throw new Error("Missing required product id");
    }

    const product: ProductWithRelations | null = await this.prisma.product.findFirst({
      where: {
        id: productId,
        status: ProductStatus.ACTIVE
      },
      include: {
        images: {
          orderBy: { sortOrder: "asc" }
        },
        variants: {
          where: { isActive: true },
          orderBy: [{ sizeLabel: "asc" }, { color: "asc" }]
        },
        designer: {
          select: {
            storeName: true,
            slug: true
          }
        }
      }
    });

    if (!product) {
      return { card: null };
    }

    return {
      card: this.toProductCard(product),
      details: {
        description: product.description,
        images: product.images.map((image) => image.url),
        inventory: product.variants.map((variant) => ({
          id: variant.id,
          size: variant.sizeLabel,
          color: variant.color,
          stock: variant.stockTotal - variant.stockReserved
        }))
      }
    };
  }

  private toProductCard(product: ProductWithRelations): ProductCard {
    return {
      id: product.id,
      title: product.title,
      rentalPrice: Number(product.rentalPrice),
      imageUrl: product.images[0]?.url ?? null,
      category: product.category,
      designer: {
        storeName: product.designer.storeName,
        slug: product.designer.slug
      },
      sizeOptions: [...new Set(product.variants.map((variant) => variant.sizeLabel))],
      colorOptions: [...new Set(product.variants.map((variant) => variant.color))],
      bodyShapes: product.bodyShapes
    };
  }

  private parseSearchFilters(args: Record<string, unknown>): ParsedSearchFilters {
    return {
      category:
        args.category === "SUIT" || args.category === "DRESS"
          ? args.category
          : undefined,
      size: typeof args.size === "string" ? args.size : undefined,
      color: typeof args.color === "string" ? args.color : undefined,
      designerQuery:
        typeof args.designerQuery === "string" ? args.designerQuery.trim() || undefined : undefined,
      bodyShape: this.isBodyShape(args.bodyShape) ? args.bodyShape : undefined,
      minPrice: typeof args.minPrice === "number" ? args.minPrice : undefined,
      maxPrice: typeof args.maxPrice === "number" ? args.maxPrice : undefined,
      limit:
        typeof args.limit === "number" && Number.isInteger(args.limit) && args.limit > 0
          ? Math.min(args.limit, 12)
          : 8
    };
  }

  private toRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }

    return value as Record<string, unknown>;
  }

  private buildPrompt(payload: AiRecommendationDto, profile: UserProfileContext): string {
    const history = (payload.history ?? [])
      .map((message) => ({
        role: message.role,
        text: message.text.trim()
      }))
      .filter((message): message is ConversationTurn => message.text.length > 0)
      .slice(-10);

    return [
      "You are Drapeon stylist AI.",
      "You can answer both style-shopping questions and company/process questions.",
      "You must recommend existing products from tools only; never invent products.",
      "Never mention a product title, designer name, or product link unless it came from this turn's tool output.",
      "When body shape is known, prefer searchProducts with the bodyShape filter before giving any style guidance.",
      "If the user names a designer, atelier, or store, treat that as a strict searchProducts designerQuery filter instead of a soft preference.",
      "Do not claim garment features that were not verified by tool output. Keep reasoning grounded in availability, category, stored fit profile, and designer body-shape tags.",
      "If user profile measurements are available, use them and do not ask for those values again.",
      "If the user is browsing as a guest, still help fully and only ask for missing fit details when they are necessary for a better recommendation.",
      "Match body shape whenever it is present in the stored fit profile or user request.",
      "Use searchCompanyKnowledge for questions about Drapeon, fittings, designer subscriptions, onboarding, returns, and payments.",
      "Prefer calling searchProducts first, then getProductDetails only for top candidates.",
      "Respond with concise styling rationale and prioritize fit confidence.",
      `User prompt: ${payload.prompt}`,
      `Recent conversation: ${JSON.stringify(history)}`,
      `Filters: ${JSON.stringify(payload.filters ?? {})}`,
      `User context: ${JSON.stringify(profile)}`
    ].join("\n");
  }

  private async logAiMessage(
    sessionId: string,
    input: {
      role: AiMessageRole;
      content: string;
      toolName?: string;
      toolInput?: Record<string, unknown>;
      toolOutput?: Record<string, unknown>;
    }
  ) {
    await this.prisma.aiMessage.create({
      data: {
        sessionId,
        role: input.role,
        content: input.content,
        toolName: input.toolName,
        toolInput: input.toolInput as Prisma.InputJsonValue | undefined,
        toolOutput: input.toolOutput as Prisma.InputJsonValue | undefined
      }
    });
  }

  private isBodyShape(value: unknown): value is BodyShape {
    return (
      value === "HOURGLASS" ||
      value === "PEAR" ||
      value === "APPLE" ||
      value === "RECTANGLE" ||
      value === "INVERTED_TRIANGLE" ||
      value === "ATHLETIC"
    );
  }

  private buildGroundedContext(
    payload: AiRecommendationDto,
    profile: UserProfileContext
  ): GroundedRecommendationContext {
    return {
      prompt: payload.prompt,
      filters: (this.toRecord(payload.filters) ?? null) as Record<string, unknown> | null,
      profile,
      usedStoredMeasurements: payload.measurements == null && profile.measurements != null
    };
  }

  private async finalizeRecommendation(
    sessionId: string,
    groundedContext: GroundedRecommendationContext,
    collectedCards: Map<string, ProductCard>,
    collectedKnowledge: Map<string, KnowledgeEntryCard>,
    payload?: AiRecommendationDto,
    preface?: string
  ): Promise<RecommendationResult> {
    if (payload) {
      await this.hydrateGroundedCollections(payload, groundedContext, collectedCards, collectedKnowledge);
    }

    const finalProducts = selectGroundedProducts(Array.from(collectedCards.values()), groundedContext);
    const finalKnowledgeEntries = Array.from(collectedKnowledge.values()).slice(0, 2);
    const recommendationText = [
      preface?.trim(),
      composeGroundedRecommendationText(groundedContext, finalProducts, finalKnowledgeEntries)
    ]
      .filter((section): section is string => Boolean(section))
      .join("\n\n");

    await this.logAiMessage(sessionId, {
      role: AiMessageRole.AGENT,
      content: recommendationText
    });

    return {
      recommendationText,
      products: finalProducts,
      knowledgeEntries: finalKnowledgeEntries,
      context: {
        usedStoredMeasurements: groundedContext.usedStoredMeasurements
      }
    };
  }

  private async generateContentWithRetry(contents: Content[]) {
    for (let attempt = 0; attempt <= this.modelRetryDelaysMs.length; attempt += 1) {
      try {
        return await this.gemini.models.generateContent({
          model: this.modelName,
          contents,
          config: {
            tools: [
              {
                functionDeclarations: this.functionDeclarations
              }
            ]
          }
        });
      } catch (error) {
        if (!this.isTransientModelError(error) || attempt >= this.modelRetryDelaysMs.length) {
          throw error;
        }

        await this.delay(this.modelRetryDelaysMs[attempt]!);
      }
    }

    throw new Error("The AI response could not be generated.");
  }

  /**
   * Return a list of AI sessions and their messages for the given user.
   * If no userId is provided, returns an empty array.
   */
  async getSessionsForUser(userId: string | null | undefined) {
    if (!userId) {
      return [];
    }

    const sessions = await this.prisma.aiSession.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { startedAt: "desc" },
      take: 100
    });

    return sessions.map((s) => {
      const firstUser = s.messages.find((m) => m.role === "USER");
      const title = firstUser
        ? firstUser.content.length <= 38
          ? firstUser.content
          : `${firstUser.content.slice(0, 35).trimEnd()}...`
        : s.messages[0]?.content ?? "Conversation";

      return {
        id: s.id,
        title,
        createdAt: s.startedAt.toISOString(),
        updatedAt:
          (s.messages?.length ?? 0) > 0
            ? (s.messages![s.messages!.length - 1]!.createdAt).toISOString()
            : s.startedAt.toISOString(),
        messages: s.messages.map((m) => ({
          id: m.id,
          role: m.role === "USER" ? "user" : "agent",
          text: m.content,
          createdAt: m.createdAt.toISOString()
        }))
      };
    });
  }

  private async hydrateGroundedCollections(
    payload: AiRecommendationDto,
    groundedContext: GroundedRecommendationContext,
    collectedCards: Map<string, ProductCard>,
    collectedKnowledge: Map<string, KnowledgeEntryCard>
  ): Promise<void> {
    if (collectedCards.size === 0 && this.shouldSearchFallbackCatalog(payload)) {
      try {
        const catalogResult = await this.searchProductsTool(
          this.buildFallbackSearchArgs(payload, groundedContext.profile)
        );

        for (const item of catalogResult.items) {
          collectedCards.set(item.id, item);
        }
      } catch (error) {
        this.logger.warn(
          `Catalog grounding search failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    if (
      collectedKnowledge.size === 0 &&
      collectedCards.size === 0 &&
      this.shouldSearchFallbackKnowledge(payload.prompt)
    ) {
      try {
        const knowledgeResult = await this.searchCompanyKnowledgeTool({
          query: payload.prompt,
          limit: 2
        });

        for (const item of knowledgeResult.items) {
          collectedKnowledge.set(item.id, item);
        }
      } catch (error) {
        this.logger.warn(
          `Knowledge grounding search failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  }

  private async buildModelAvailabilityFallback(
    sessionId: string,
    payload: AiRecommendationDto,
    groundedContext: GroundedRecommendationContext,
    collectedCards: Map<string, ProductCard>,
    collectedKnowledge: Map<string, KnowledgeEntryCard>
  ): Promise<RecommendationResult> {
    if (collectedCards.size === 0 && this.shouldSearchFallbackCatalog(payload)) {
      try {
        const productFallback = await this.searchProductsTool(
          this.buildFallbackSearchArgs(payload, groundedContext.profile)
        );

        for (const item of productFallback.items) {
          collectedCards.set(item.id, item);
        }
      } catch (error) {
        this.logger.warn(
          `Catalog fallback search failed after model overload: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    if (
      collectedKnowledge.size === 0 &&
      (this.shouldSearchFallbackKnowledge(payload.prompt) || collectedCards.size === 0)
    ) {
      try {
        const knowledgeFallback = await this.searchCompanyKnowledgeTool({
          query: payload.prompt,
          limit: 2
        });

        for (const item of knowledgeFallback.items) {
          collectedKnowledge.set(item.id, item);
        }
      } catch (error) {
        this.logger.warn(
          `Knowledge fallback search failed after model overload: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    const preface =
      collectedCards.size > 0 || collectedKnowledge.size > 0
        ? "Our live stylist model is under heavy demand right now, so I pulled the closest verified matches directly from Drapeon's live catalog tools."
        : "Our live stylist model is under heavy demand right now. I could not verify fresh matches from the tools just yet, but I can still help if you add your preferred category, color, or event type.";

    return this.finalizeRecommendation(
      sessionId,
      groundedContext,
      collectedCards,
      collectedKnowledge,
      payload,
      preface
    );
  }

  private buildFallbackSearchArgs(
    payload: AiRecommendationDto,
    profile: UserProfileContext
  ): Record<string, unknown> {
    const filters = this.toRecord(payload.filters) ?? {};
    const prompt = payload.prompt.toLowerCase();
    const bodyShape = this.extractBodyShape(filters.bodyShape) ?? this.extractBodyShape(profile.measurements?.bodyShape);
    const budget = this.extractBudgetRange(prompt);
    const color = typeof filters.color === "string" ? filters.color : this.extractPromptColor(prompt);
    const size = typeof filters.size === "string" ? filters.size : this.extractPromptSize(prompt);
    const designerQuery =
      typeof filters.designerQuery === "string" ? filters.designerQuery : this.extractPromptDesigner(payload.prompt);

    return {
      category:
        typeof filters.category === "string"
          ? filters.category
          : /\b(suit|suits|tuxedo|tuxedos|tailoring|jacket|jackets)\b/.test(prompt)
            ? ProductCategory.SUIT
            : /\b(dress|dresses|gown|gowns|cocktail|cocktails|eveningwear)\b/.test(prompt)
              ? ProductCategory.DRESS
              : undefined,
      size,
      color,
      designerQuery,
      bodyShape,
      minPrice: budget.minPrice,
      maxPrice: budget.maxPrice,
      limit: 6
    };
  }

  private extractBodyShape(value: unknown): BodyShape | undefined {
    return this.isBodyShape(value) ? value : undefined;
  }

  private shouldSearchFallbackKnowledge(prompt: string): boolean {
    const normalized = prompt.toLowerCase();

    return /\b(drapeon|policy|process|return|subscription|designer|onboarding|payment|fitting|appointment|how|what|why)\b/.test(
      normalized
    );
  }

  private shouldSearchFallbackCatalog(payload: AiRecommendationDto): boolean {
    const filters = this.toRecord(payload.filters) ?? {};

    if (
      typeof filters.category === "string" ||
      typeof filters.size === "string" ||
      typeof filters.color === "string" ||
      this.isBodyShape(filters.bodyShape)
    ) {
      return true;
    }

    return /\b(find|give|recommend|show|need|want|looking|wear|dress|dresses|gown|gowns|suit|suits|tuxedo|tuxedos|tailoring|style|outfit|catalog|product)\b/.test(
      payload.prompt.toLowerCase()
    );
  }

  private extractBudgetRange(prompt: string): {
    minPrice?: number;
    maxPrice?: number;
  } {
    const normalized = prompt.toLowerCase();
    const underMatch = normalized.match(/\b(?:under|below|less than|max(?:imum)?(?: budget)?(?: of)?|up to)\s*\$?\s*(\d{2,4})\b/);
    const overMatch = normalized.match(/\b(?:over|above|more than|min(?:imum)?(?: budget)?(?: of)?|starting at)\s*\$?\s*(\d{2,4})\b/);
    const betweenMatch = normalized.match(/\bbetween\s*\$?\s*(\d{2,4})\s*(?:and|-)\s*\$?\s*(\d{2,4})\b/);
    const rangeMatch = normalized.match(/\$\s*(\d{2,4})\s*-\s*\$?\s*(\d{2,4})\b/);

    if (betweenMatch?.[1] && betweenMatch[2]) {
      return {
        minPrice: Number(betweenMatch[1]),
        maxPrice: Number(betweenMatch[2])
      };
    }

    if (rangeMatch?.[1] && rangeMatch[2]) {
      return {
        minPrice: Number(rangeMatch[1]),
        maxPrice: Number(rangeMatch[2])
      };
    }

    return {
      minPrice: overMatch?.[1] ? Number(overMatch[1]) : undefined,
      maxPrice: underMatch?.[1] ? Number(underMatch[1]) : undefined
    };
  }

  private extractPromptColor(prompt: string): string | undefined {
    const colors = [
      "black",
      "midnight blue",
      "navy",
      "ivory",
      "emerald",
      "burgundy",
      "champagne",
      "sand",
      "slate grey",
      "gray",
      "grey",
      "white"
    ];
    const normalized = prompt.toLowerCase();
    const matched = colors.find((color) => normalized.includes(color));

    if (!matched) {
      return undefined;
    }

    if (matched === "navy") {
      return "Midnight Blue";
    }

    if (matched === "gray" || matched === "grey" || matched === "slate grey") {
      return "Slate Grey";
    }

    if (matched === "white") {
      return "Ivory";
    }

    return matched
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  private extractPromptSize(prompt: string): string | undefined {
    const normalized = prompt.toLowerCase();
    const alphaSize = normalized.match(/\b(?:size\s*)?(xs|s|m|l|xl)\b/);

    if (alphaSize?.[1]) {
      return alphaSize[1].toUpperCase();
    }

    const numericSize = normalized.match(/\b(?:size\s*)?(46|48|50|52|54)\b/);
    return numericSize?.[1];
  }

  private extractPromptDesigner(prompt: string): string | undefined {
    const normalizedPrompt = prompt.trim();
    const designerPatterns = [
      /\b(?:posted by|by|from)\s+([a-z][a-z\s'.-]*?(?:atelier|studio|house|designs?))\b/i,
      /\b([a-z][a-z\s'.-]*?(?:atelier|studio|house|designs?))\b/i
    ];

    for (const pattern of designerPatterns) {
      const candidate = normalizedPrompt.match(pattern)?.[1]?.replace(/\s+/g, " ").trim();

      if (candidate && candidate.length >= 4) {
        return candidate;
      }
    }

    return undefined;
  }

  private isTransientModelError(error: unknown): boolean {
    const record = error as
      | {
          status?: number | string;
          message?: string;
          error?: { code?: number | string; message?: string; status?: string };
        }
      | undefined;
    const status = record?.status ?? record?.error?.code;
    const message = `${record?.message ?? ""} ${record?.error?.message ?? ""} ${record?.error?.status ?? ""}`.toLowerCase();

    return (
      status === 429 ||
      status === 503 ||
      status === "429" ||
      status === "503" ||
      /unavailable|resource_exhausted|high demand|temporar|rate limit|overloaded/.test(message)
    );
  }

  private async delay(durationMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
  }
}
