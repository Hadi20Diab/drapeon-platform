import { Module } from "@nestjs/common";

import { DesignersController } from "./designers.controller";
import { DesignersService } from "./designers.service";

@Module({
  controllers: [DesignersController],
  providers: [DesignersService],
  exports: [DesignersService]
})
export class DesignersModule {}
