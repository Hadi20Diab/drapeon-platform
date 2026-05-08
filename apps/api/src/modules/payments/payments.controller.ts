import { Body, Controller, Post, UseGuards } from "@nestjs/common";

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
  handleStripeWebhook(@Body() payload: unknown) {
    return this.paymentsService.handleStripeWebhook(payload);
  }
}
