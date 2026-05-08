import { Module } from "@nestjs/common";

import { StripeConnectService } from "../../integrations/stripe/stripe-connect.service";
import { AuthModule } from "../auth/auth.module";
import { DesignersController } from "./designers.controller";
import { DesignersService } from "./designers.service";

@Module({
  imports: [AuthModule],
  controllers: [DesignersController],
  providers: [DesignersService, StripeConnectService],
  exports: [DesignersService]
})
export class DesignersModule {}
