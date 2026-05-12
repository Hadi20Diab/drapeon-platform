import { randomUUID } from "node:crypto";

import { Injectable, NotFoundException } from "@nestjs/common";
import {
  DesignerApprovalStatus,
  DesignerSubscriptionStatus,
  Prisma,
  ProductStatus
} from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { DesignersService } from "../designers/designers.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { ProductFiltersDto } from "./dto/product-filters.dto";

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly designersService: DesignersService
  ) {}

  async createProduct(userId: string, payload: CreateProductDto) {
    const designerId = await this.designersService.getDesignerIdByUserId(userId);
    const slug = await this.resolveUniqueSlug(this.toSlug(payload.title));

    return this.prisma.product.create({
      data: {
        designerId,
        category: payload.category,
        title: payload.title,
        slug,
        description: payload.description,
        rentalPrice: new Prisma.Decimal(payload.rentalPrice),
        bodyShapes: payload.bodyShapes ?? [],
        status: ProductStatus.ACTIVE,
        images: {
          create: payload.images.map((image, index) => ({
            url: image.url,
            altText: image.altText,
            sortOrder: index
          }))
        },
        variants: {
          create: payload.variants.map((variant) => ({
            sizeLabel: variant.size,
            color: variant.color,
            stockTotal: variant.stockTotal,
            sku: variant.sku ?? `SKU-${randomUUID().slice(0, 8).toUpperCase()}`
          }))
        }
      },
      include: {
        images: {
          orderBy: { sortOrder: "asc" }
        },
        variants: true
      }
    });
  }

  async listProducts(filters: ProductFiltersDto) {
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
      designer: this.publicDesignerVisibility(),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.query
        ? {
            OR: [
              { title: { contains: filters.query, mode: "insensitive" } },
              { designer: { storeName: { contains: filters.query, mode: "insensitive" } } }
            ]
          }
        : {}),
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
          stockTotal: {
            gt: 0
          },
          ...(filters.size ? { sizeLabel: filters.size } : {}),
          ...(filters.color ? { color: filters.color } : {})
        }
      }
    };

    const page = filters.page ?? 0;
    const limit = filters.limit ?? 12;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: {
          images: {
            take: 1,
            orderBy: { sortOrder: "asc" }
          },
          variants: {
            where: { isActive: true },
            orderBy: [{ sizeLabel: "asc" }, { color: "asc" }]
          },
          designer: {
            select: {
              id: true,
              storeName: true,
              slug: true
            }
          }
        },
        skip: page * limit,
        take: limit,
        orderBy: filters.sort === "price" ? { rentalPrice: "asc" } : { createdAt: "desc" }
      }),
      this.prisma.product.count({ where })
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total
      }
    };
  }

  async getProductById(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        status: ProductStatus.ACTIVE,
        designer: this.publicDesignerVisibility()
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
            id: true,
            storeName: true,
            slug: true,
            location: true
          }
        }
      }
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} was not found`);
    }

    return product;
  }

  private async resolveUniqueSlug(baseSlug: string): Promise<string> {
    const existing = await this.prisma.product.findUnique({
      where: { slug: baseSlug },
      select: { id: true }
    });

    if (!existing) {
      return baseSlug;
    }

    return `${baseSlug}-${randomUUID().slice(0, 8)}`;
  }

  private toSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
  }

  private publicDesignerVisibility(): Prisma.DesignerWhereInput {
    return {
      approvalStatus: DesignerApprovalStatus.APPROVED,
      subscription: {
        is: {
          status: {
            in: [DesignerSubscriptionStatus.ACTIVE, DesignerSubscriptionStatus.TRIALING]
          }
        }
      }
    };
  }
}
