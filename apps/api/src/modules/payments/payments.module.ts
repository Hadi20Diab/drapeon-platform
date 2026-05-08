import { Module } from "@nestjs/common";

import { StripeConnectService } from "../../integrations/stripe/stripe-connect.service";
import { AuthModule } from "../auth/auth.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeConnectService]
})
export class PaymentsModule {}
