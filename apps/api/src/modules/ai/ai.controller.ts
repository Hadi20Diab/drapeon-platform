import { Body, Controller, Post, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AiRecommendationDto } from "./dto/ai-recommendation.dto";
import { AiService } from "./ai.service";

@Controller("ai")
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("recommendations")
  getRecommendations(@CurrentUser("sub") userId: string, @Body() payload: AiRecommendationDto) {
    return this.aiService.recommend(userId, payload);
  }
}
