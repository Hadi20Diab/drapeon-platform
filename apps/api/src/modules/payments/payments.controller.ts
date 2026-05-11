import { Body, Controller, Get, Headers, Post, Req, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Request } from "express";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateDesignerSubscriptionCheckoutDto } from "./dto/create-designer-subscription-checkout.dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("subscriptions/plans")
  listSubscriptionPlans() {
    return this.paymentsService.listSubscriptionPlans();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DESIGNER)
  @Post("subscriptions/checkout")
  createDesignerSubscriptionCheckout(
    @CurrentUser("sub") userId: string,
    @Body() payload: CreateDesignerSubscriptionCheckoutDto
  ) {
    return this.paymentsService.createDesignerSubscriptionCheckout(userId, payload);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DESIGNER)
  @Post("subscriptions/portal")
  createDesignerBillingPortal(@CurrentUser("sub") userId: string) {
    return this.paymentsService.createDesignerBillingPortal(userId);
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
