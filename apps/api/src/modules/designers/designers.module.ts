import { Module } from "@nestjs/common";

import { StripeConnectService } from "../../integrations/stripe/stripe-connect.service";
import { AuthModule } from "../auth/auth.module";
import { DesignerRealtimeGateway } from "./designer-realtime.gateway";
import { DesignersController } from "./designers.controller";
import { DesignersService } from "./designers.service";

@Module({
  imports: [AuthModule],
  controllers: [DesignersController],
  providers: [DesignersService, StripeConnectService, DesignerRealtimeGateway],
  exports: [DesignersService]
})
export class DesignersModule {}
