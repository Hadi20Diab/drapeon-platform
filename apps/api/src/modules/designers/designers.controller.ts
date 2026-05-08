import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateStoreDto } from "./dto/create-store.dto";
import { DesignersService } from "./designers.service";

@Controller("designers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DESIGNER)
export class DesignersController {
  constructor(private readonly designersService: DesignersService) {}

  @Post("store")
  createStore(@CurrentUser("sub") userId: string, @Body() payload: CreateStoreDto) {
    return this.designersService.createOrUpdateStore(userId, payload);
  }

  @Get("dashboard")
  getDashboard(@CurrentUser("sub") userId: string) {
    return this.designersService.getDashboard(userId);
  }

  @Post("stripe/onboarding-link")
  createStripeOnboardingLink(@CurrentUser("sub") userId: string) {
    return this.designersService.createStripeOnboardingLink(userId);
  }

  @Post("stripe/refresh-status")
  refreshStripeStatus(@CurrentUser("sub") userId: string) {
    return this.designersService.refreshStripeStatus(userId);
  }
}
