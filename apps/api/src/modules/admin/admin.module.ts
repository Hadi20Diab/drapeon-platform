import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [AuthModule, KnowledgeModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
