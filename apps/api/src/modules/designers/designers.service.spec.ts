import { ForbiddenException } from "@nestjs/common";

import { DesignersService } from "./designers.service";

describe("DesignersService", () => {
  function createService(designer: Record<string, unknown>) {
    const prisma = {
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
          approvalStatus: "APPROVED",
          stripeAccountId: null,
          stripeOnboardingComplete: false,
          stripeChargesEnabled: false,
          stripePayoutsEnabled: false,
          stripeDetailsSubmitted: false,
          ...designer
        })
      },
      product: {
        findUnique: jest.fn(),
        create: jest.fn()
      }
    } as any;

    return {
      service: new DesignersService(prisma, { getCommissionRate: jest.fn(() => 0.075) } as any),
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
    status: "ACTIVE" as const
  };

  it("blocks product creation until Stripe Connect is payout ready", async () => {
    const { service } = createService({ stripeAccountId: null });

    await expect(service.createDesignerProduct("user-1", payload)).rejects.toThrow(ForbiddenException);
  });

  it("allows product creation for Stripe-ready designers", async () => {
    const { service, prisma } = createService({
      stripeAccountId: "acct_ready",
      stripeOnboardingComplete: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      stripeDetailsSubmitted: true
    });
    prisma.product.findUnique.mockResolvedValue(null);
    prisma.product.create.mockResolvedValue({ id: "product-1" });

    await expect(service.createDesignerProduct("user-1", payload)).resolves.toEqual({ id: "product-1" });
  });
});
