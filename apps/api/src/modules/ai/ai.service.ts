import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { AiRecommendationDto } from "./dto/ai-recommendation.dto";

interface ProductCard {
  id: string;
  title: string;
  rentalPrice: number;
  imageUrl: string | null;
}

interface RecommendationResult {
  recommendationText: string;
  products: ProductCard[];
  context: {
    usedStoredMeasurements: boolean;
  };
}

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService
  ) {}

  async recommend(userId: string, payload: AiRecommendationDto): Promise<RecommendationResult> {
    const profile = await this.getUserProfile(userId, payload.measurements);
    const productCards = await this.searchProducts(payload.filters);

    return {
      recommendationText: this.buildNarrative(payload.prompt, profile != null),
      products: productCards,
      context: {
        usedStoredMeasurements: profile != null && payload.measurements == null
      }
    };
  }

  private async getUserProfile(userId: string, providedMeasurements?: unknown) {
    if (providedMeasurements != null) {
      return {
        userId,
        measurements: providedMeasurements
      };
    }

    return this.usersService.getCurrentUserProfile(userId);
  }

  private async searchProducts(filters: AiRecommendationDto["filters"]): Promise<ProductCard[]> {
    const products = await this.prisma.product.findMany({
      where: {
        status: "ACTIVE",
        ...(filters?.category ? { category: filters.category as never } : {})
      },
      include: {
        images: {
          take: 1,
          orderBy: {
            sortOrder: "asc"
          }
        }
      },
      take: 8
    });

    return products.map((product) => ({
      id: product.id,
      title: product.title,
      rentalPrice: Number(product.rentalPrice),
      imageUrl: product.images[0]?.url ?? null
    }));
  }

  private buildNarrative(prompt: string, hasMeasurementContext: boolean): string {
    if (hasMeasurementContext) {
      return `Recommendations are tailored to your saved body profile. Request: ${prompt}`;
    }

    return `Recommendations are based on your request. Add body measurements for a tighter fit. Request: ${prompt}`;
  }
}
