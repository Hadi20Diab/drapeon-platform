import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProductStatus } from "@prisma/client";

import { StripeConnectService } from "../../integrations/stripe/stripe-connect.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateStripeCheckoutDto } from "./dto/create-stripe-checkout.dto";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly stripeConnectService: StripeConnectService
  ) {}

  async createStripeCheckout(userId: string, payload: CreateStripeCheckoutDto) {
    if (payload.items.length === 0) {
      throw new BadRequestException("Cart is empty");
    }

    const quantityByProductId = new Map<string, number>();

    for (const item of payload.items) {
      quantityByProductId.set(
        item.productId,
        (quantityByProductId.get(item.productId) ?? 0) + item.quantity
      );
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: [...quantityByProductId.keys()] },
        status: ProductStatus.ACTIVE
      },
      select: {
        id: true,
        title: true,
        rentalPrice: true,
        currency: true,
        designerId: true,
        designer: {
          select: {
            storeName: true,
            stripeAccountId: true,
            stripeChargesEnabled: true,
            stripePayoutsEnabled: true
          }
        }
      }
    });

    if (products.length !== quantityByProductId.size) {
      throw new BadRequestException("One or more cart items are no longer available");
    }

    const designerIds = new Set(products.map((product) => product.designerId));

    if (designerIds.size > 1) {
      throw new BadRequestException(
        "Stripe Connect checkout currently supports one designer per payment."
      );
    }

    const designer = products[0]?.designer;
    const currency = this.stripeConnectService.getCurrency();
    const subtotalCents = products.reduce((sum, product) => {
      const quantity = quantityByProductId.get(product.id) ?? 1;
      return sum + this.toCents(Number(product.rentalPrice)) * quantity;
    }, 0);
    const commissionCents = Math.round(
      subtotalCents * this.stripeConnectService.getCommissionRate()
    );
    const designerCents = subtotalCents - commissionCents;

    if (!this.stripeConnectService.isConfigured()) {
      return {
        mode: "configuration_required",
        provider: "stripe",
        checkoutUrl: null,
        totals: this.formatTotals(subtotalCents, commissionCents, designerCents, currency),
        message: "Set STRIPE_SECRET_KEY to create a real Stripe Checkout session."
      };
    }

    if (!designer?.stripeAccountId) {
      return {
        mode: "stripe_onboarding_required",
        provider: "stripe",
        checkoutUrl: null,
        totals: this.formatTotals(subtotalCents, commissionCents, designerCents, currency),
        message: `${designer?.storeName ?? "This designer"} needs to finish Stripe Connect onboarding before checkout.`
      };
    }

    const webOrigin = this.configService.get<string>("WEB_ORIGIN", "http://localhost:5173");
    const session = await this.stripeConnectService.createCheckoutSession({
      mode: "payment",
      customer_email: payload.customer?.email,
      client_reference_id: userId,
      line_items: products.map((product) => ({
        quantity: quantityByProductId.get(product.id) ?? 1,
        price_data: {
          currency,
          product_data: {
            name: product.title,
            metadata: {
              productId: product.id
            }
          },
          unit_amount: this.toCents(Number(product.rentalPrice))
        }
      })),
      payment_intent_data: {
        application_fee_amount: commissionCents,
        transfer_data: {
          destination: designer.stripeAccountId
        },
        metadata: {
          platform: "drapeon",
          commission_bps: this.stripeConnectService.getCommissionBasisPoints().toString()
        }
      },
      metadata: {
        userId,
        designerAccountId: designer.stripeAccountId,
        commissionCents: commissionCents.toString()
      },
      success_url:
        this.configService.get<string>("STRIPE_SUCCESS_URL") ??
        `${webOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: this.configService.get<string>("STRIPE_CANCEL_URL") ?? `${webOrigin}/checkout`
    });

    return {
      mode: "stripe_connect_checkout",
      provider: "stripe",
      sessionId: session?.id,
      checkoutUrl: session?.url ?? null,
      totals: this.formatTotals(subtotalCents, commissionCents, designerCents, currency)
    };
  }

  handleStripeWebhook(payload: unknown) {
    return {
      received: true,
      provider: "stripe",
      payload
    };
  }

  private formatTotals(
    subtotalCents: number,
    commissionCents: number,
    designerCents: number,
    currency: string
  ) {
    return {
      subtotal: subtotalCents / 100,
      commissionRate: this.stripeConnectService.getCommissionRate(),
      commissionAmount: commissionCents / 100,
      designerAmount: designerCents / 100,
      currency
    };
  }

  private toCents(value: number): number {
    return Math.round(value * 100);
  }
}
