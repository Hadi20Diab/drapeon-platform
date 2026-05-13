import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { AiRecommendationDto } from "./dto/ai-recommendation.dto";
import { AiService } from "./ai.service";

@Controller("ai")
@UseGuards(OptionalJwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("recommendations")
  getRecommendations(@CurrentUser("sub") userId: string | undefined, @Body() payload: AiRecommendationDto) {
    return this.aiService.recommend(userId, payload, { channel: "REST" });
  }

  @Get("/sessions")
  async getSessions(@CurrentUser("sub") userId: string | undefined) {
    return this.aiService.getSessionsForUser(userId ?? null);
  }
}
