import { Module } from "@nestjs/common";

import { MailidatorService } from "./mailidator.service";

@Module({
  providers: [MailidatorService],
  exports: [MailidatorService]
})
export class MailidatorModule {}
