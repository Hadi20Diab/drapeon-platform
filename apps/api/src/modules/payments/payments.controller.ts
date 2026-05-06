import { Body, Controller, Post, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateTapCheckoutDto } from "./dto/create-tap-checkout.dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post("tap/checkout")
  createTapCheckout(@CurrentUser("sub") _: string, @Body() payload: CreateTapCheckoutDto) {
    return this.paymentsService.createTapCheckout(payload);
  }

  @Post("tap/webhook")
  handleTapWebhook(@Body() payload: unknown) {
    return {
      received: true,
      provider: "tap",
      payload
    };
  }
}
