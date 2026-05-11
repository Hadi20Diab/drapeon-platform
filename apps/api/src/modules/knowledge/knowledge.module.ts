import { Module } from "@nestjs/common";

import { PineconeModule } from "../../integrations/pinecone/pinecone.module";
import { CompanyKnowledgeService } from "./knowledge.service";

@Module({
  imports: [PineconeModule],
  providers: [CompanyKnowledgeService],
  exports: [CompanyKnowledgeService]
})
export class KnowledgeModule {}
