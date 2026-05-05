import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  health(): { status: "ok"; service: string } {
    return {
      status: "ok",
      service: "drapeon-api"
    };
  }
}
