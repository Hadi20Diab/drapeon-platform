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

type ParsedSearchFilters = {
  category?: ProductCategory;
  size?: string;
  color?: string;
  bodyShape?: BodyShape;
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
        "Search active products in the catalog using optional filters for category, size, color, and price range.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, enum: ["SUIT", "DRESS"] },
          size: { type: Type.STRING },
          color: { type: Type.STRING },
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
        const response = await this.gemini.models.generateContent({
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
        const modelContent = response.candidates?.[0]?.content;

        if (modelContent) {
          contents.push(modelContent);
        }

        const functionCalls = response.functionCalls ?? [];

        if (functionCalls.length === 0) {
          const finalProducts = selectGroundedProducts(Array.from(collectedCards.values()), {
            prompt: payload.prompt,
            filters: (this.toRecord(payload.filters) ?? null) as Record<string, unknown> | null,
            profile: userProfile,
            usedStoredMeasurements: payload.measurements == null && userProfile.measurements != null
          });
          const finalKnowledgeEntries = Array.from(collectedKnowledge.values()).slice(0, 2);
          const recommendationText = composeGroundedRecommendationText(
            {
              prompt: payload.prompt,
              filters: (this.toRecord(payload.filters) ?? null) as Record<string, unknown> | null,
              profile: userProfile,
              usedStoredMeasurements: payload.measurements == null && userProfile.measurements != null
            },
            finalProducts,
            finalKnowledgeEntries
          );

          await this.logAiMessage(session.id, {
            role: AiMessageRole.AGENT,
            content: recommendationText
          });

          return {
            recommendationText,
            products: finalProducts,
            knowledgeEntries: finalKnowledgeEntries,
            context: {
              usedStoredMeasurements:
                payload.measurements == null && userProfile.measurements != null
            }
          };
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

      const finalProducts = selectGroundedProducts(Array.from(collectedCards.values()), {
        prompt: payload.prompt,
        filters: (this.toRecord(payload.filters) ?? null) as Record<string, unknown> | null,
        profile: userProfile,
        usedStoredMeasurements: payload.measurements == null && userProfile.measurements != null
      });
      const finalKnowledgeEntries = Array.from(collectedKnowledge.values()).slice(0, 2);
      const fallbackText = composeGroundedRecommendationText(
        {
          prompt: payload.prompt,
          filters: (this.toRecord(payload.filters) ?? null) as Record<string, unknown> | null,
          profile: userProfile,
          usedStoredMeasurements: payload.measurements == null && userProfile.measurements != null
        },
        finalProducts,
        finalKnowledgeEntries
      );

      await this.logAiMessage(session.id, {
        role: AiMessageRole.AGENT,
        content: fallbackText
      });

      return {
        recommendationText: fallbackText,
        products: finalProducts,
        knowledgeEntries: finalKnowledgeEntries,
        context: {
          usedStoredMeasurements: payload.measurements == null && userProfile.measurements != null
        }
      };
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
}
