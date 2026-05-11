import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { UsersModule } from "../users/users.module";
import { AiController } from "./ai.controller";
import { AiGateway } from "./ai.gateway";
import { AiService } from "./ai.service";

@Module({
  imports: [UsersModule, AuthModule, KnowledgeModule],
  controllers: [AiController],
  providers: [AiService, AiGateway],
  exports: [AiService]
})
export class AiModule {}
