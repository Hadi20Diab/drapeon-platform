import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DesignerRealtimeGateway } from "./designer-realtime.gateway";
import { DesignersController } from "./designers.controller";
import { DesignersService } from "./designers.service";

@Module({
  imports: [AuthModule],
  controllers: [DesignersController],
  providers: [DesignersService, DesignerRealtimeGateway],
  exports: [DesignersService]
})
export class DesignersModule {}
