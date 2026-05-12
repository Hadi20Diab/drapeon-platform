import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe = require("stripe");

type StripeClient = Stripe.Stripe;
type StripeConstructEvent = StripeClient["webhooks"]["constructEvent"];
type StripeCheckoutSessionParams = Parameters<StripeClient["checkout"]["sessions"]["create"]>[0];
type StripeBillingPortalSessionParams = Parameters<
  StripeClient["billingPortal"]["sessions"]["create"]
>[0];
type StripeSubscription = Awaited<ReturnType<StripeClient["subscriptions"]["retrieve"]>>;

@Injectable()
export class StripeBillingService {
  private stripeClient: StripeClient | null | undefined;

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return this.getClient() !== null;
  }

  getCurrency(): string {
    return this.configService.get<string>("STRIPE_CURRENCY", "usd").toLowerCase();
  }

  async createCheckoutSession(payload: StripeCheckoutSessionParams) {
    const stripe = this.getClient();

    if (!stripe) {
      return null;
    }

    return stripe.checkout.sessions.create(payload);
  }

  async createBillingPortalSession(payload: StripeBillingPortalSessionParams) {
    const stripe = this.getClient();

    if (!stripe) {
      return null;
    }

    return stripe.billingPortal.sessions.create(payload);
  }

  async retrieveSubscription(subscriptionId: string): Promise<StripeSubscription | null> {
    const stripe = this.getClient();

    if (!stripe) {
      return null;
    }

    return stripe.subscriptions.retrieve(subscriptionId);
  }

  constructWebhookEvent(
    payload: Buffer | string,
    signature: string,
    secret: string
  ): ReturnType<StripeConstructEvent> {
    const stripe = this.getClient();

    if (!stripe) {
      throw new Error("Stripe is not configured");
    }

    return stripe.webhooks.constructEvent(payload, signature, secret);
  }

  private getClient(): StripeClient | null {
    if (this.stripeClient !== undefined) {
      return this.stripeClient;
    }

    const secretKey = this.configService.get<string>("STRIPE_SECRET_KEY")?.trim();

    if (!secretKey) {
      this.stripeClient = null;
      return this.stripeClient;
    }

    this.stripeClient = new Stripe(secretKey);
    return this.stripeClient;
  }
}
