import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DesignersController } from "./designers.controller";
import { DesignersService } from "./designers.service";

@Module({
  imports: [AuthModule],
  controllers: [DesignersController],
  providers: [DesignersService],
  exports: [DesignersService]
})
export class DesignersModule {}
