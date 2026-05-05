import { Module } from "@nestjs/common";

import { UsersModule } from "../users/users.module";
import { AiController } from "./ai.controller";
import { AiGateway } from "./ai.gateway";
import { AiService } from "./ai.service";

@Module({
  imports: [UsersModule],
  controllers: [AiController],
  providers: [AiService, AiGateway],
  exports: [AiService]
})
export class AiModule {}
