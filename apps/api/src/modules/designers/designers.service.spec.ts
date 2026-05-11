import { ForbiddenException } from "@nestjs/common";
import {
  DesignerApprovalStatus,
  DesignerSubscriptionStatus,
  SubscriptionInterval
} from "@prisma/client";

import { DesignersService } from "./designers.service";

describe("DesignersService", () => {
  function createService(designer: Record<string, unknown>) {
    const prisma: any = {
      designer: {
        findUnique: jest.fn().mockResolvedValue({
          id: "designer-1",
          userId: "user-1",
          storeName: "Atelier Test",
          bio: "Bio",
          location: "Beirut",
          brandColor: null,
          websiteUrl: null,
          instagramUrl: null,
          tiktokUrl: null,
          approvalStatus: DesignerApprovalStatus.APPROVED,
          subscription: null,
          ...designer
        })
      },
      designerSubscription: {
        update: jest.fn()
      },
      product: {
        findUnique: jest.fn(),
        create: jest.fn()
      },
      $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) =>
        callback({
          product: prisma.product,
          designerSubscription: prisma.designerSubscription,
          productImage: { deleteMany: jest.fn() },
          productAvailability: { deleteMany: jest.fn() },
          productVariant: { deleteMany: jest.fn() }
        })
      )
    } as any;

    return {
      service: new DesignersService(prisma),
      prisma
    };
  }

  const payload = {
    title: "Silk Evening Dress",
    description: "A rental-ready evening piece with premium finishing.",
    category: "DRESS" as const,
    rentalPrice: 180,
    sizes: ["S"],
    colors: ["Ivory"],
    stockQuantity: 2,
    images: ["https://example.com/dress.jpg"],
    tags: ["evening"],
    bodyShapes: ["RECTANGLE"],
    status: "ACTIVE" as const
  };

  it("blocks product creation until the designer has an active subscription", async () => {
    const { service } = createService({ subscription: null });

    await expect(service.createDesignerProduct("user-1", payload)).rejects.toThrow(
      ForbiddenException
    );
  });

  it("allows product creation for active subscribed designers and increments usage", async () => {
    const { service, prisma } = createService({
      subscription: {
        id: "sub-1",
        status: DesignerSubscriptionStatus.ACTIVE,
        productLimitSnapshot: 10,
        productsPublishedThisPeriod: 2,
        usagePeriodStart: new Date("2026-05-01T00:00:00.000Z"),
        usagePeriodEnd: new Date("2026-06-01T00:00:00.000Z"),
        currentPeriodStart: new Date("2026-05-01T00:00:00.000Z"),
        currentPeriodEnd: new Date("2026-06-01T00:00:00.000Z"),
        cancelAtPeriodEnd: false,
        subscribedAt: new Date("2026-05-01T00:00:00.000Z"),
        lastSyncedAt: new Date("2026-05-01T00:00:00.000Z"),
        plan: {
          id: "plan-1",
          slug: "atelier-10",
          name: "Atelier 10",
          amount: 149,
          currency: "USD",
          interval: SubscriptionInterval.MONTH,
          productLimit: 10,
          featured: true,
          features: []
        }
      }
    });
    prisma.product.findUnique.mockResolvedValue(null);
    prisma.product.create.mockResolvedValue({ id: "product-1" });
    prisma.designerSubscription.update.mockResolvedValue({});

    await expect(service.createDesignerProduct("user-1", payload)).resolves.toEqual({
      id: "product-1"
    });
    expect(prisma.designerSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-1" },
        data: expect.objectContaining({
          productsPublishedThisPeriod: { increment: 1 }
        })
      })
    );
  });
});
