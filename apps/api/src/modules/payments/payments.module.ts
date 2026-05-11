import { Module } from "@nestjs/common";

import { StripeBillingService } from "../../integrations/stripe/stripe-billing.service";
import { AuthModule } from "../auth/auth.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeBillingService]
})
export class PaymentsModule {}
