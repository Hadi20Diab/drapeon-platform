import { randomUUID } from "node:crypto";

import { GoogleGenAI, Type, createPartFromFunctionResponse, createUserContent } from "@google/genai";
import type { Content, FunctionCall, FunctionDeclaration, Part } from "@google/genai";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, ProductCategory, ProductStatus } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { AiRecommendationDto } from "./dto/ai-recommendation.dto";

interface ProductCard {
  id: string;
  title: string;
  rentalPrice: number;
  imageUrl: string | null;
  category: string;
  designer: {
    storeName: string;
    slug: string;
  };
  sizeOptions: string[];
  colorOptions: string[];
}

interface RecommendationResult {
  recommendationText: string;
  products: ProductCard[];
  context: {
    usedStoredMeasurements: boolean;
  };
}

interface AiAgentEvent {
  type: "tool_call" | "tool_result";
  tool: string;
  payload: unknown;
}

interface RecommendOptions {
  onEvent?: (event: AiAgentEvent) => void;
}

type UserProfileContext = {
  firstName: string | null;
  measurements: Record<string, unknown> | null;
  preferences: Record<string, unknown> | null;
};

type ParsedSearchFilters = {
  category?: ProductCategory;
  size?: string;
  color?: string;
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
          minPrice: { type: Type.NUMBER },
          maxPrice: { type: Type.NUMBER },
          limit: { type: Type.INTEGER }
        },
        required: []
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
    private readonly configService: ConfigService
  ) {
    this.gemini = new GoogleGenAI({
      apiKey: this.configService.getOrThrow<string>("GEMINI_API_KEY")
    });
    this.modelName = this.configService.get<string>("GEMINI_MODEL", "gemini-3-flash-preview");
  }

  async recommend(
    userId: string,
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
        return {
          recommendationText: response.text?.trim() || "I found matching outfits from the catalog.",
          products: Array.from(collectedCards.values()),
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
          options.onEvent
        );
        toolResponseParts.push(part);
      }

      contents.push(createUserContent(toolResponseParts));
    }

    return {
      recommendationText:
        "I reached a tool-call limit while refining recommendations. Here are the best matches found so far.",
      products: Array.from(collectedCards.values()),
      context: {
        usedStoredMeasurements: payload.measurements == null && userProfile.measurements != null
      }
    };
  }

  private async executeFunctionCall(
    userId: string,
    functionCall: FunctionCall,
    collectedCards: Map<string, ProductCard>,
    onEvent?: (event: AiAgentEvent) => void
  ): Promise<Part> {
    const functionId = functionCall.id ?? randomUUID();
    const name = functionCall.name ?? "";
    const args = functionCall.args ?? {};

    onEvent?.({
      type: "tool_call",
      tool: name,
      payload: args
    });

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

      return createPartFromFunctionResponse(functionId, name, responsePayload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown tool execution error";
      this.logger.error(`Tool execution failed for ${name}`, error instanceof Error ? error.stack : undefined);
      return createPartFromFunctionResponse(functionId, name, {
        error: message
      });
    }
  }

  private async getUserProfileContext(
    userId: string,
    overrideMeasurements?: Record<string, unknown>
  ): Promise<UserProfileContext> {
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
      variants: {
        some: {
          isActive: true,
          ...(filters.size ? { sizeLabel: filters.size } : {}),
          ...(filters.color ? { color: filters.color } : {})
        }
      }
    };
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
      take: filters.limit
    });

    return {
      items: products.map((product) => this.toProductCard(product))
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
      colorOptions: [...new Set(product.variants.map((variant) => variant.color))]
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
    return [
      "You are Drapeon stylist AI.",
      "You must recommend existing products from tools only; never invent products.",
      "If user profile measurements are available, use them and do not ask for those values again.",
      "Prefer calling searchProducts first, then getProductDetails only for top candidates.",
      "Respond with concise styling rationale and prioritize fit confidence.",
      `User prompt: ${payload.prompt}`,
      `Filters: ${JSON.stringify(payload.filters ?? {})}`,
      `User context: ${JSON.stringify(profile)}`
    ].join("\n");
  }
}
