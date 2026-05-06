import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { CreateTapCheckoutDto } from "./dto/create-tap-checkout.dto";

const marketplaceCommissionRate = 0.075;

interface TapChargeResponse {
  id?: string;
  transaction?: {
    url?: string;
  };
}

@Injectable()
export class PaymentsService {
  constructor(private readonly configService: ConfigService) {}

  async createTapCheckout(payload: CreateTapCheckoutDto) {
    if (payload.items.length === 0) {
      throw new BadRequestException("Cart is empty");
    }

    const currency = this.configService.get<string>("TAP_CURRENCY", "USD");
    const subtotal = this.roundMoney(
      payload.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    );
    const commissionAmount = this.roundMoney(subtotal * marketplaceCommissionRate);
    const designerAmount = this.roundMoney(subtotal - commissionAmount);
    const tapSecretKey = this.configService.get<string>("TAP_SECRET_KEY");
    const redirectUrl =
      this.configService.get<string>("TAP_REDIRECT_URL") ??
      "http://localhost:5173/checkout/success";

    if (!tapSecretKey) {
      return {
        mode: "configuration_required",
        checkoutUrl: null,
        provider: "tap",
        totals: {
          subtotal,
          commissionRate: marketplaceCommissionRate,
          commissionAmount,
          designerAmount,
          currency
        },
        message: "Set TAP_SECRET_KEY to create a real Tap hosted checkout session."
      };
    }

    const firstDestinationId = payload.items.find((item) => item.designerDestinationId)
      ?.designerDestinationId;
    const chargePayload: Record<string, unknown> = {
      amount: subtotal,
      currency,
      customer_initiated: true,
      threeDSecure: true,
      save_card: false,
      description: "Drapeon rental checkout",
      metadata: {
        commission_rate: marketplaceCommissionRate.toString(),
        commission_amount: commissionAmount.toString()
      },
      customer: {
        first_name: payload.customer.firstName,
        last_name: payload.customer.lastName,
        email: payload.customer.email,
        ...(payload.customer.phoneNumber
          ? {
              phone: {
                country_code: "961",
                number: payload.customer.phoneNumber.replace(/\D/g, "")
              }
            }
          : {})
      },
      source: {
        id: "src_all"
      },
      redirect: {
        url: redirectUrl
      }
    };

    const merchantId = this.configService.get<string>("TAP_MERCHANT_ID");
    const postUrl = this.configService.get<string>("TAP_POST_URL");

    if (merchantId) {
      chargePayload.merchant = { id: merchantId };
    }

    if (postUrl) {
      chargePayload.post = { url: postUrl };
    }

    if (firstDestinationId) {
      chargePayload.destinations = {
        destination: [
          {
            id: firstDestinationId,
            amount: designerAmount,
            currency
          }
        ]
      };
    }

    const response = await fetch("https://api.tap.company/v2/charges/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tapSecretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(chargePayload)
    });
    const responseBody = (await response.json()) as TapChargeResponse & {
      errors?: unknown;
      message?: string;
    };

    if (!response.ok) {
      throw new BadRequestException(responseBody.message ?? "Tap checkout creation failed");
    }

    return {
      mode: firstDestinationId ? "tap_split_checkout" : "tap_checkout",
      provider: "tap",
      chargeId: responseBody.id,
      checkoutUrl: responseBody.transaction?.url ?? null,
      totals: {
        subtotal,
        commissionRate: marketplaceCommissionRate,
        commissionAmount,
        designerAmount,
        currency
      }
    };
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
