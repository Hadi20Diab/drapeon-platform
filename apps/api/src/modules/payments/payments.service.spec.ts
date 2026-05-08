import { BadRequestException } from "@nestjs/common";
import { ProductStatus } from "@prisma/client";

import { PaymentsService } from "./payments.service";

function config(values: Record<string, unknown> = {}) {
  return {
    get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback)
  };
}

describe("PaymentsService", () => {
  function createService(overrides?: {
    prisma?: Record<string, unknown>;
    stripe?: Record<string, unknown>;
    configValues?: Record<string, unknown>;
  }) {
    const prisma = {
      product: {
        findMany: jest.fn()
      },
      designer: {
        updateMany: jest.fn()
      },
      ...(overrides?.prisma ?? {})
    } as any;
    const stripe = {
      getCurrency: jest.fn(() => "usd"),
      getCommissionRate: jest.fn(() => 0.075),
      getCommissionBasisPoints: jest.fn(() => 750),
      isConfigured: jest.fn(() => false),
      createCheckoutSession: jest.fn(),
      constructWebhookEvent: jest.fn(),
      ...(overrides?.stripe ?? {})
    } as any;

    return {
      service: new PaymentsService(prisma, config(overrides?.configValues) as any, stripe),
      prisma,
      stripe
    };
  }

  it("returns configuration_required totals when Stripe is not configured", async () => {
    const { service, prisma } = createService();
    prisma.product.findMany.mockResolvedValue([
      {
        id: "product-1",
        title: "Evening Dress",
        rentalPrice: 200,
        currency: "USD",
        designerId: "designer-1",
        designer: {
          storeName: "Atelier Test",
          stripeAccountId: "acct_test",
          stripeChargesEnabled: true,
          stripePayoutsEnabled: true
        }
      }
    ]);

    const result = await service.createStripeCheckout("user-1", {
      items: [{ productId: "product-1", quantity: 2 }]
    });

    expect(result.mode).toBe("configuration_required");
    expect(result.totals).toEqual({
      subtotal: 400,
      commissionRate: 0.075,
      commissionAmount: 30,
      designerAmount: 370,
      currency: "usd"
    });
  });

  it("rejects carts that span multiple designers", async () => {
    const { service, prisma } = createService();
    prisma.product.findMany.mockResolvedValue([
      { id: "product-1", title: "Dress", rentalPrice: 100, designerId: "designer-1", designer: {} },
      { id: "product-2", title: "Suit", rentalPrice: 120, designerId: "designer-2", designer: {} }
    ]);

    await expect(
      service.createStripeCheckout("user-1", {
        items: [
          { productId: "product-1", quantity: 1 },
          { productId: "product-2", quantity: 1 }
        ]
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("creates a Stripe Connect checkout session when designer onboarding exists", async () => {
    const { service, prisma, stripe } = createService({
      stripe: {
        isConfigured: jest.fn(() => true),
        createCheckoutSession: jest.fn().mockResolvedValue({ id: "cs_test", url: "https://checkout.stripe.test/session" })
      }
    });
    prisma.product.findMany.mockResolvedValue([
      {
        id: "product-1",
        title: "Black Tuxedo",
        rentalPrice: 150,
        designerId: "designer-1",
        designer: {
          storeName: "Atelier Test",
          stripeAccountId: "acct_123",
          stripeChargesEnabled: true,
          stripePayoutsEnabled: true
        }
      }
    ]);

    const result = await service.createStripeCheckout("user-1", {
      items: [{ productId: "product-1", quantity: 1 }],
      customer: { email: "customer@example.com" }
    });

    expect(result.checkoutUrl).toBe("https://checkout.stripe.test/session");
    expect(stripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: "customer@example.com",
        payment_intent_data: expect.objectContaining({
          application_fee_amount: 1125,
          transfer_data: { destination: "acct_123" }
        })
      })
    );
  });

  it("syncs connected account status from account.updated webhook events", async () => {
    const { service, prisma } = createService();

    await service.handleStripeWebhook({
      payload: {
        type: "account.updated",
        data: {
          object: {
            id: "acct_1TUj5ZLhJyHSphBA",
            charges_enabled: true,
            payouts_enabled: true,
            details_submitted: true
          }
        }
      }
    });

    expect(prisma.designer.updateMany).toHaveBeenCalledWith({
      where: { stripeAccountId: "acct_1TUj5ZLhJyHSphBA" },
      data: {
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeDetailsSubmitted: true,
        stripeOnboardingComplete: true
      }
    });
  });

  it("requires a Stripe signature when webhook signing is configured", async () => {
    const { service } = createService({ configValues: { STRIPE_WEBHOOK_SECRET: "whsec_test" } });

    await expect(service.handleStripeWebhook({ payload: { type: "payment_intent.succeeded" } })).rejects.toThrow(
      BadRequestException
    );
  });
});
