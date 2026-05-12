import { BadRequestException, ForbiddenException } from "@nestjs/common";
import {
  DesignerApprovalStatus,
  DesignerSubscriptionStatus,
  SubscriptionInterval
} from "@prisma/client";

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
      subscriptionPlan: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn()
      },
      designer: {
        findUnique: jest.fn()
      },
      designerSubscription: {
        upsert: jest.fn(),
        findFirst: jest.fn()
      },
      ...(overrides?.prisma ?? {})
    } as any;
    const stripe = {
      isConfigured: jest.fn(() => false),
      createCheckoutSession: jest.fn(),
      createBillingPortalSession: jest.fn(),
      constructWebhookEvent: jest.fn(),
      ...(overrides?.stripe ?? {})
    } as any;

    return {
      service: new PaymentsService(prisma, config(overrides?.configValues) as any, stripe),
      prisma,
      stripe
    };
  }

  const plan = {
    id: "plan-1",
    slug: "atelier-10",
    name: "Atelier 10",
    description: "Up to 10 products each billing cycle.",
    stripePriceId: "price_123",
    stripeProductId: "prod_123",
    currency: "USD",
    interval: SubscriptionInterval.MONTH,
    amount: 149,
    productLimit: 10,
    featured: true,
    isActive: true,
    sortOrder: 1,
    notes: null,
    features: ["10 active products", "Priority support"]
  };

  const designer = {
    id: "designer-1",
    userId: "user-1",
    storeName: "Atelier Test",
    approvalStatus: DesignerApprovalStatus.APPROVED,
    user: {
      email: "designer@example.com",
      profile: { firstName: "Maya", lastName: "Haddad" }
    },
    subscription: null
  };

  it("lists active subscription plans in billing order", async () => {
    const { service, prisma } = createService();
    prisma.subscriptionPlan.findMany.mockResolvedValue([plan]);

    await expect(service.listSubscriptionPlans()).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: "plan-1",
          amount: 149
        })
      ]
    });
  });

  it("returns configuration_required when Stripe is not configured", async () => {
    const { service, prisma } = createService();
    prisma.designer.findUnique.mockResolvedValue(designer);
    prisma.subscriptionPlan.findFirst.mockResolvedValue(plan);

    const result = await service.createDesignerSubscriptionCheckout("user-1", { planId: "plan-1" });

    expect(result.mode).toBe("configuration_required");
    expect(result.plan.amount).toBe(149);
  });

  it("redirects active subscribers to the Stripe billing portal", async () => {
    const { service, prisma, stripe } = createService({
      stripe: {
        isConfigured: jest.fn(() => true),
        createBillingPortalSession: jest.fn().mockResolvedValue({ url: "https://billing.stripe.test/portal" })
      }
    });
    prisma.designer.findUnique.mockResolvedValue({
      ...designer,
      subscription: {
        stripeCustomerId: "cus_123",
        status: DesignerSubscriptionStatus.ACTIVE
      }
    });
    prisma.subscriptionPlan.findFirst.mockResolvedValue(plan);

    const result = await service.createDesignerSubscriptionCheckout("user-1", { planId: "plan-1" });

    expect(result.mode).toBe("billing_portal");
    expect(result.url).toBe("https://billing.stripe.test/portal");
    expect(stripe.createBillingPortalSession).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_123" })
    );
  });

  it("creates a Stripe subscription checkout session for eligible designers", async () => {
    const { service, prisma, stripe } = createService({
      stripe: {
        isConfigured: jest.fn(() => true),
        createCheckoutSession: jest.fn().mockResolvedValue({
          id: "cs_test",
          url: "https://checkout.stripe.test/subscription",
          customer: "cus_123"
        })
      }
    });
    prisma.designer.findUnique.mockResolvedValue(designer);
    prisma.subscriptionPlan.findFirst.mockResolvedValue(plan);
    prisma.designerSubscription.upsert.mockResolvedValue({ id: "sub-row-1" });

    const result = await service.createDesignerSubscriptionCheckout("user-1", { planId: "plan-1" });

    expect(result.mode).toBe("subscription_checkout");
    expect(result.url).toBe("https://checkout.stripe.test/subscription");
    expect(stripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer_email: "designer@example.com",
        line_items: [{ price: "price_123", quantity: 1 }]
      })
    );
    expect(prisma.designerSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { designerId: "designer-1" }
      })
    );
  });

  it("expands WEB_ORIGIN placeholders for Stripe checkout URLs", async () => {
    const { service, prisma, stripe } = createService({
      configValues: {
        WEB_ORIGIN: "http://localhost:5173",
        STRIPE_SUBSCRIPTION_SUCCESS_URL:
          "${WEB_ORIGIN}/designers/billing?status=success&session_id={CHECKOUT_SESSION_ID}",
        STRIPE_SUBSCRIPTION_CANCEL_URL: "${WEB_ORIGIN}/designers/billing?status=cancelled"
      },
      stripe: {
        isConfigured: jest.fn(() => true),
        createCheckoutSession: jest.fn().mockResolvedValue({
          id: "cs_test",
          url: "https://checkout.stripe.test/subscription",
          customer: "cus_123"
        })
      }
    });
    prisma.designer.findUnique.mockResolvedValue(designer);
    prisma.subscriptionPlan.findFirst.mockResolvedValue(plan);
    prisma.designerSubscription.upsert.mockResolvedValue({ id: "sub-row-1" });

    await service.createDesignerSubscriptionCheckout("user-1", { planId: "plan-1" });

    expect(stripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url:
          "http://localhost:5173/designers/billing?status=success&session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "http://localhost:5173/designers/billing?status=cancelled"
      })
    );
  });

  it("accepts relative Stripe return paths and resolves them against WEB_ORIGIN", async () => {
    const { service, prisma, stripe } = createService({
      configValues: {
        WEB_ORIGIN: "http://localhost:5173",
        STRIPE_BILLING_PORTAL_RETURN_URL: "/designers/billing"
      },
      stripe: {
        isConfigured: jest.fn(() => true),
        createBillingPortalSession: jest.fn().mockResolvedValue({
          url: "https://billing.stripe.test/portal"
        })
      }
    });
    prisma.designer.findUnique.mockResolvedValue({
      ...designer,
      subscription: {
        stripeCustomerId: "cus_123",
        status: DesignerSubscriptionStatus.ACTIVE
      }
    });

    await service.createDesignerBillingPortal("user-1");

    expect(stripe.createBillingPortalSession).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "http://localhost:5173/designers/billing"
    });
  });

  it("throws a readable error for malformed Stripe redirect URLs", async () => {
    const { service, prisma } = createService({
      configValues: {
        WEB_ORIGIN: "http://localhost:5173",
        STRIPE_SUBSCRIPTION_SUCCESS_URL: "not-a-url"
      },
      stripe: {
        isConfigured: jest.fn(() => true)
      }
    });
    prisma.designer.findUnique.mockResolvedValue(designer);
    prisma.subscriptionPlan.findFirst.mockResolvedValue(plan);

    await expect(
      service.createDesignerSubscriptionCheckout("user-1", { planId: "plan-1" })
    ).rejects.toThrow(BadRequestException);
  });

  it("blocks rejected designers from starting a subscription", async () => {
    const { service, prisma } = createService();
    prisma.designer.findUnique.mockResolvedValue({
      ...designer,
      approvalStatus: DesignerApprovalStatus.REJECTED
    });
    prisma.subscriptionPlan.findFirst.mockResolvedValue(plan);

    await expect(
      service.createDesignerSubscriptionCheckout("user-1", { planId: "plan-1" })
    ).rejects.toThrow(ForbiddenException);
  });

  it("requires a billing profile before opening the portal directly", async () => {
    const { service, prisma } = createService();
    prisma.designer.findUnique.mockResolvedValue({
      ...designer,
      subscription: null
    });

    await expect(service.createDesignerBillingPortal("user-1")).rejects.toThrow(BadRequestException);
  });

  it("syncs subscription state from Stripe webhooks", async () => {
    const { service, prisma } = createService();
    prisma.subscriptionPlan.findUnique.mockResolvedValue(plan);
    prisma.designerSubscription.findFirst.mockResolvedValue({
      designerId: "designer-1",
      planId: "plan-1",
      productLimitSnapshot: 10,
      productsPublishedThisPeriod: 4,
      subscribedAt: new Date("2026-05-01T00:00:00.000Z"),
      usagePeriodEnd: new Date("2026-06-01T00:00:00.000Z")
    });

    await service.handleStripeWebhook({
      payload: {
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_123",
            customer: "cus_123",
            status: "active",
            cancel_at_period_end: false,
            current_period_start: 1_778_291_200,
            current_period_end: 1_780_876_800,
            metadata: { designerId: "designer-1" },
            items: {
              data: [{ price: { id: "price_123" } }]
            }
          }
        }
      }
    });

    expect(prisma.designerSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { designerId: "designer-1" },
        update: expect.objectContaining({
          status: DesignerSubscriptionStatus.ACTIVE,
          stripeSubscriptionId: "sub_123",
          stripeCustomerId: "cus_123",
          productLimitSnapshot: 10
        })
      })
    );
  });

  it("requires a Stripe signature when webhook signing is configured", async () => {
    const { service } = createService({ configValues: { STRIPE_WEBHOOK_SECRET: "whsec_test" } });

    await expect(
      service.handleStripeWebhook({ payload: { type: "customer.subscription.updated" } })
    ).rejects.toThrow(BadRequestException);
  });
});
