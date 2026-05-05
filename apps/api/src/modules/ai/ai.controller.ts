import { Body, Controller, Post, Query } from "@nestjs/common";
import { IsUUID } from "class-validator";

import { AiRecommendationDto } from "./dto/ai-recommendation.dto";
import { AiService } from "./ai.service";

class UserQueryDto {
  @IsUUID()
  userId!: string;
}

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("recommendations")
  getRecommendations(@Query() query: UserQueryDto, @Body() payload: AiRecommendationDto) {
    return this.aiService.recommend(query.userId, payload);
  }
}
