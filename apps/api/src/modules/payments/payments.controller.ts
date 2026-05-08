import { Body, Controller, Headers, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateStripeCheckoutDto } from "./dto/create-stripe-checkout.dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post("stripe/checkout")
  createStripeCheckout(
    @CurrentUser("sub") userId: string,
    @Body() payload: CreateStripeCheckoutDto
  ) {
    return this.paymentsService.createStripeCheckout(userId, payload);
  }

  @Post("stripe/webhook")
  handleStripeWebhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Body() payload: unknown,
    @Headers("stripe-signature") signature?: string
  ) {
    return this.paymentsService.handleStripeWebhook({
      payload,
      rawBody: request.rawBody,
      signature
    });
  }
}
