import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe = require("stripe");

export interface DesignerAccountInput {
  email: string;
  firstName: string;
  lastName: string;
}

type StripeClient = Stripe.Stripe;
type StripeAccount = Awaited<ReturnType<StripeClient["accounts"]["create"]>>;
type StripeAccountLink = Awaited<ReturnType<StripeClient["accountLinks"]["create"]>>;
type StripeCheckoutSessionParams = Parameters<StripeClient["checkout"]["sessions"]["create"]>[0];

@Injectable()
export class StripeConnectService {
  private stripeClient: StripeClient | null | undefined;

  constructor(private readonly configService: ConfigService) {}

  getCommissionRate(): number {
    return this.getCommissionBasisPoints() / 10_000;
  }

  getCommissionBasisPoints(): number {
    return this.configService.get<number>("STRIPE_PLATFORM_FEE_BPS", 750);
  }

  getCurrency(): string {
    return this.configService.get<string>("STRIPE_CURRENCY", "usd").toLowerCase();
  }

  isConfigured(): boolean {
    return this.getClient() !== null;
  }

  async createDesignerAccount(input: DesignerAccountInput): Promise<StripeAccount | null> {
    const stripe = this.getClient();

    if (!stripe) {
      return null;
    }

    return stripe.accounts.create({
      type: "express",
      country: this.configService.get<string>("STRIPE_CONNECT_COUNTRY", "US"),
      email: input.email,
      business_type: "individual",
      individual: {
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      metadata: {
        platform: "drapeon"
      }
    });
  }

  async createOnboardingLink(accountId: string): Promise<StripeAccountLink | null> {
    const stripe = this.getClient();

    if (!stripe) {
      return null;
    }

    const webOrigin = this.configService.get<string>("WEB_ORIGIN", "http://localhost:5173");

    return stripe.accountLinks.create({
      account: accountId,
      refresh_url:
        this.configService.get<string>("STRIPE_CONNECT_REFRESH_URL") ??
        `${webOrigin}/designers/dashboard?stripe=refresh`,
      return_url:
        this.configService.get<string>("STRIPE_CONNECT_RETURN_URL") ??
        `${webOrigin}/designers/dashboard?stripe=return`,
      type: "account_onboarding"
    });
  }

  async retrieveAccount(accountId: string): Promise<StripeAccount | null> {
    const stripe = this.getClient();

    if (!stripe) {
      return null;
    }

    return stripe.accounts.retrieve(accountId);
  }

  async createCheckoutSession(payload: StripeCheckoutSessionParams) {
    const stripe = this.getClient();

    if (!stripe) {
      return null;
    }

    return stripe.checkout.sessions.create(payload);
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
