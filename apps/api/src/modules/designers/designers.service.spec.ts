import { ForbiddenException } from "@nestjs/common";
import {
  DesignerApprovalStatus,
  DesignerSubscriptionStatus,
  SubscriptionInterval
} from "@prisma/client";

import { DesignersService } from "./designers.service";

describe("DesignersService", () => {
  function currentUsageWindow() {
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    return { start, end };
  }

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
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
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

    prisma.$transaction.mockImplementation(async (input: unknown) => {
      if (Array.isArray(input)) {
        return Promise.all(input as Promise<unknown>[]);
      }

      return (input as (tx: any) => Promise<unknown>)({
        product: prisma.product,
        designerSubscription: prisma.designerSubscription,
        productImage: { deleteMany: jest.fn() },
        productAvailability: { deleteMany: jest.fn() },
        productVariant: { deleteMany: jest.fn() }
      });
    });

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
    const usageWindow = currentUsageWindow();
    const { service, prisma } = createService({
      subscription: {
        id: "sub-1",
        status: DesignerSubscriptionStatus.ACTIVE,
        productLimitSnapshot: 10,
        productsPublishedThisPeriod: 2,
        usagePeriodStart: usageWindow.start,
        usagePeriodEnd: usageWindow.end,
        currentPeriodStart: usageWindow.start,
        currentPeriodEnd: usageWindow.end,
        cancelAtPeriodEnd: false,
        subscribedAt: usageWindow.start,
        lastSyncedAt: usageWindow.start,
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

  it("sorts designer products by fitting demand when using the most rented view", async () => {
    const usageWindow = currentUsageWindow();
    const { service, prisma } = createService({
      subscription: {
        id: "sub-1",
        status: DesignerSubscriptionStatus.ACTIVE,
        productLimitSnapshot: 10,
        productsPublishedThisPeriod: 2,
        usagePeriodStart: usageWindow.start,
        usagePeriodEnd: usageWindow.end,
        currentPeriodStart: usageWindow.start,
        currentPeriodEnd: usageWindow.end,
        cancelAtPeriodEnd: false,
        subscribedAt: usageWindow.start,
        lastSyncedAt: usageWindow.start,
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

    prisma.product.findMany.mockResolvedValue([
      {
        id: "product-1",
        title: "First",
        rentalPrice: 120,
        images: [],
        variants: [],
        _count: { bookings: 1 }
      },
      {
        id: "product-2",
        title: "Second",
        rentalPrice: 200,
        images: [],
        variants: [],
        _count: { bookings: 4 }
      }
    ]);
    prisma.product.count.mockResolvedValue(2);

    const result = await service.listDesignerProducts("user-1", {
      sort: "most_rented",
      page: 0,
      limit: 12
    } as any);

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: "product-2",
        fittingCount: 4
      })
    );
    expect(result.items[1]).toEqual(
      expect.objectContaining({
        id: "product-1",
        fittingCount: 1
      })
    );
  });
});
