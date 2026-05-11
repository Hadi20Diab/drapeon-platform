import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DesignerApprovalStatus,
  DesignerSubscriptionStatus,
  Prisma,
  SubscriptionInterval
} from "@prisma/client";

import { StripeBillingService } from "../../integrations/stripe/stripe-billing.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateDesignerSubscriptionCheckoutDto } from "./dto/create-designer-subscription-checkout.dto";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set<DesignerSubscriptionStatus>([
  DesignerSubscriptionStatus.ACTIVE,
  DesignerSubscriptionStatus.TRIALING,
  DesignerSubscriptionStatus.PAST_DUE,
  DesignerSubscriptionStatus.UNPAID
]);

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly stripeBillingService: StripeBillingService
  ) {}

  async listSubscriptionPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { amount: "asc" }]
    });

    return {
      items: plans.map((plan) => this.serializePlan(plan))
    };
  }

  async createDesignerSubscriptionCheckout(
    userId: string,
    payload: CreateDesignerSubscriptionCheckoutDto
  ) {
    const [designer, plan] = await Promise.all([
      this.prisma.designer.findUnique({
        where: { userId },
        include: {
          user: {
            include: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          subscription: true
        }
      }),
      this.prisma.subscriptionPlan.findFirst({
        where: {
          id: payload.planId,
          isActive: true
        }
      })
    ]);

    if (!designer) {
      throw new NotFoundException("Designer profile was not found");
    }

    if (!plan) {
      throw new NotFoundException("Subscription plan was not found");
    }

    if (designer.approvalStatus === DesignerApprovalStatus.REJECTED) {
      throw new ForbiddenException("Rejected designer accounts cannot start subscriptions.");
    }

    if (!this.stripeBillingService.isConfigured()) {
      return {
        mode: "configuration_required",
        provider: "stripe",
        url: null,
        plan: this.serializePlan(plan),
        message: "Set STRIPE_SECRET_KEY to create a live Stripe subscription checkout."
      };
    }

    if (
      designer.subscription?.stripeCustomerId &&
      ACTIVE_SUBSCRIPTION_STATUSES.has(designer.subscription.status)
    ) {
      const portal = await this.createPortalSession(designer.subscription.stripeCustomerId);

      return {
        mode: "billing_portal",
        provider: "stripe",
        url: portal?.url ?? null,
        plan: this.serializePlan(plan),
        message:
          "This designer already has an active subscription. Open the Stripe customer portal to change or cancel the plan."
      };
    }

    const webOrigin = this.configService.get<string>("WEB_ORIGIN", "http://localhost:5173");
    const session = await this.stripeBillingService.createCheckoutSession({
      mode: "subscription",
      success_url:
        this.configService.get<string>("STRIPE_SUBSCRIPTION_SUCCESS_URL") ??
        `${webOrigin}/designers/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        this.configService.get<string>("STRIPE_SUBSCRIPTION_CANCEL_URL") ??
        `${webOrigin}/designers/billing?status=cancelled`,
      customer: designer.subscription?.stripeCustomerId ?? undefined,
      customer_email: designer.subscription?.stripeCustomerId ? undefined : designer.user.email,
      client_reference_id: designer.userId,
      allow_promotion_codes: true,
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1
        }
      ],
      metadata: {
        platform: "drapeon",
        designerId: designer.id,
        planId: plan.id
      },
      subscription_data: {
        metadata: {
          platform: "drapeon",
          designerId: designer.id,
          planId: plan.id,
          designerEmail: designer.user.email
        }
      }
    });

    await this.prisma.designerSubscription.upsert({
      where: { designerId: designer.id },
      create: {
        designerId: designer.id,
        planId: plan.id,
        stripeCustomerId:
          typeof session?.customer === "string" ? session.customer : designer.subscription?.stripeCustomerId,
        stripeCheckoutSessionId: session?.id ?? null,
        status: DesignerSubscriptionStatus.INCOMPLETE,
        productLimitSnapshot: plan.productLimit,
        lastCheckoutAt: new Date(),
        lastSyncedAt: new Date()
      },
      update: {
        planId: plan.id,
        stripeCustomerId:
          typeof session?.customer === "string" ? session.customer : designer.subscription?.stripeCustomerId,
        stripeCheckoutSessionId: session?.id ?? designer.subscription?.stripeCheckoutSessionId ?? null,
        productLimitSnapshot: plan.productLimit,
        lastCheckoutAt: new Date(),
        lastSyncedAt: new Date()
      }
    });

    return {
      mode: "subscription_checkout",
      provider: "stripe",
      sessionId: session?.id ?? null,
      url: session?.url ?? null,
      plan: this.serializePlan(plan)
    };
  }

  async createDesignerBillingPortal(userId: string) {
    const designer = await this.prisma.designer.findUnique({
      where: { userId },
      include: { subscription: true }
    });

    if (!designer) {
      throw new NotFoundException("Designer profile was not found");
    }

    if (!designer.subscription?.stripeCustomerId) {
      throw new BadRequestException("This designer does not have a Stripe billing profile yet.");
    }

    if (!this.stripeBillingService.isConfigured()) {
      return {
        mode: "configuration_required",
        provider: "stripe",
        url: null,
        message: "Set STRIPE_SECRET_KEY to open the Stripe billing portal."
      };
    }

    const portal = await this.createPortalSession(designer.subscription.stripeCustomerId);

    return {
      mode: "billing_portal",
      provider: "stripe",
      url: portal?.url ?? null
    };
  }

  async handleStripeWebhook(input: {
    payload: unknown;
    rawBody?: Buffer;
    signature?: string;
  }) {
    const webhookSecret = this.configService.get<string>("STRIPE_WEBHOOK_SECRET")?.trim();
    let event: { type?: string; data?: { object?: unknown } };

    if (webhookSecret) {
      if (!input.rawBody || !input.signature) {
        throw new BadRequestException("Missing Stripe webhook signature");
      }

      try {
        event = this.stripeBillingService.constructWebhookEvent(
          input.rawBody,
          input.signature,
          webhookSecret
        );
      } catch {
        throw new BadRequestException("Invalid Stripe webhook signature");
      }
    } else {
      event = input.payload as { type?: string; data?: { object?: unknown } };
    }

    await this.processStripeEvent(event);

    return {
      received: true,
      provider: "stripe",
      eventType: event.type ?? "unknown"
    };
  }

  private async processStripeEvent(event: { type?: string; data?: { object?: unknown } }) {
    switch (event.type) {
      case "checkout.session.completed":
        await this.syncCheckoutSession(event.data?.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await this.syncSubscription(event.data?.object);
        break;
      default:
        break;
    }
  }

  private async syncCheckoutSession(sessionPayload: unknown) {
    const session = sessionPayload as {
      id?: string;
      mode?: string | null;
      customer?: string | { id?: string } | null;
      subscription?: string | { id?: string } | null;
      metadata?: Record<string, string | undefined> | null;
    };

    if (session.mode !== "subscription") {
      return;
    }

    const designerId = session.metadata?.designerId;
    const planId = session.metadata?.planId;

    if (!designerId) {
      return;
    }

    await this.prisma.designerSubscription.upsert({
      where: { designerId },
      create: {
        designerId,
        planId: planId ?? null,
        stripeCustomerId: this.asStripeId(session.customer),
        stripeSubscriptionId: this.asStripeId(session.subscription),
        stripeCheckoutSessionId: session.id ?? null,
        status: DesignerSubscriptionStatus.INCOMPLETE,
        subscribedAt: new Date(),
        lastCheckoutAt: new Date(),
        lastSyncedAt: new Date()
      },
      update: {
        planId: planId ?? undefined,
        stripeCustomerId: this.asStripeId(session.customer) ?? undefined,
        stripeSubscriptionId: this.asStripeId(session.subscription) ?? undefined,
        stripeCheckoutSessionId: session.id ?? undefined,
        subscribedAt: new Date(),
        lastCheckoutAt: new Date(),
        lastSyncedAt: new Date()
      }
    });
  }

  private async syncSubscription(subscriptionPayload: unknown) {
    const subscription = subscriptionPayload as {
      id?: string;
      customer?: string | { id?: string } | null;
      status?: string | null;
      cancel_at_period_end?: boolean | null;
      canceled_at?: number | null;
      current_period_start?: number | null;
      current_period_end?: number | null;
      metadata?: Record<string, string | undefined> | null;
      items?: {
        data?: Array<{
          price?: {
            id?: string | null;
          } | null;
        }>;
      } | null;
    };

    const stripeSubscriptionId = subscription.id;
    const stripeCustomerId = this.asStripeId(subscription.customer);
    const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
    const plan = priceId
      ? await this.prisma.subscriptionPlan.findUnique({ where: { stripePriceId: priceId } })
      : null;

    const existing = await this.prisma.designerSubscription.findFirst({
      where: {
        OR: [
          ...(stripeSubscriptionId ? [{ stripeSubscriptionId }] : []),
          ...(stripeCustomerId ? [{ stripeCustomerId }] : []),
          ...(subscription.metadata?.designerId ? [{ designerId: subscription.metadata.designerId }] : [])
        ]
      }
    });

    const designerId = existing?.designerId ?? subscription.metadata?.designerId;

    if (!designerId) {
      return;
    }

    const currentPeriodStart = this.fromUnixTimestamp(subscription.current_period_start);
    const currentPeriodEnd = this.fromUnixTimestamp(subscription.current_period_end);
    const usageCycleChanged =
      currentPeriodEnd &&
      existing?.usagePeriodEnd &&
      existing.usagePeriodEnd.getTime() !== currentPeriodEnd.getTime();

    await this.prisma.designerSubscription.upsert({
      where: { designerId },
      create: {
        designerId,
        planId: plan?.id ?? existing?.planId ?? null,
        status: this.toSubscriptionStatus(subscription.status),
        stripeCustomerId,
        stripeSubscriptionId,
        productLimitSnapshot: plan?.productLimit ?? existing?.productLimitSnapshot ?? null,
        productsPublishedThisPeriod: 0,
        usagePeriodStart: currentPeriodStart,
        usagePeriodEnd: currentPeriodEnd,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        subscribedAt: new Date(),
        canceledAt: this.fromUnixTimestamp(subscription.canceled_at),
        lastSyncedAt: new Date()
      },
      update: {
        planId: plan?.id ?? existing?.planId ?? undefined,
        status: this.toSubscriptionStatus(subscription.status),
        stripeCustomerId: stripeCustomerId ?? undefined,
        stripeSubscriptionId: stripeSubscriptionId ?? undefined,
        productLimitSnapshot: plan?.productLimit ?? existing?.productLimitSnapshot ?? undefined,
        productsPublishedThisPeriod: usageCycleChanged
          ? 0
          : existing?.productsPublishedThisPeriod ?? 0,
        usagePeriodStart: currentPeriodStart ?? undefined,
        usagePeriodEnd: currentPeriodEnd ?? undefined,
        currentPeriodStart: currentPeriodStart ?? undefined,
        currentPeriodEnd: currentPeriodEnd ?? undefined,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        subscribedAt:
          existing?.subscribedAt ??
          (this.toSubscriptionStatus(subscription.status) === DesignerSubscriptionStatus.INACTIVE
            ? undefined
            : new Date()),
        canceledAt: this.fromUnixTimestamp(subscription.canceled_at),
        lastSyncedAt: new Date()
      }
    });
  }

  private async createPortalSession(customerId: string) {
    const webOrigin = this.configService.get<string>("WEB_ORIGIN", "http://localhost:5173");

    return this.stripeBillingService.createBillingPortalSession({
      customer: customerId,
      return_url:
        this.configService.get<string>("STRIPE_BILLING_PORTAL_RETURN_URL") ??
        `${webOrigin}/designers/billing`
    });
  }

  private serializePlan(
    plan: {
      id: string;
      slug: string;
      name: string;
      description: string;
      stripePriceId: string;
      stripeProductId: string | null;
      currency: string;
      interval: SubscriptionInterval;
      amount: Prisma.Decimal;
      productLimit: number;
      featured: boolean;
      isActive: boolean;
      sortOrder: number;
      notes: string | null;
      features: string[];
    }
  ) {
    return {
      ...plan,
      amount: Number(plan.amount)
    };
  }

  private toSubscriptionStatus(status: string | null | undefined): DesignerSubscriptionStatus {
    switch (status) {
      case "trialing":
        return DesignerSubscriptionStatus.TRIALING;
      case "active":
        return DesignerSubscriptionStatus.ACTIVE;
      case "past_due":
        return DesignerSubscriptionStatus.PAST_DUE;
      case "canceled":
        return DesignerSubscriptionStatus.CANCELED;
      case "unpaid":
        return DesignerSubscriptionStatus.UNPAID;
      case "incomplete":
        return DesignerSubscriptionStatus.INCOMPLETE;
      case "incomplete_expired":
        return DesignerSubscriptionStatus.INCOMPLETE_EXPIRED;
      default:
        return DesignerSubscriptionStatus.INACTIVE;
    }
  }

  private fromUnixTimestamp(value: number | null | undefined): Date | undefined {
    if (!value) {
      return undefined;
    }

    return new Date(value * 1000);
  }

  private asStripeId(
    value: string | { id?: string } | null | undefined
  ): string | undefined {
    if (!value) {
      return undefined;
    }

    return typeof value === "string" ? value : value.id;
  }
}
