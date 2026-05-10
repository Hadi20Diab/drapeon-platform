import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UpdateBodyMeasurementsDto } from "./dto/update-body-measurements.dto";
import { UpdateUserProfileDto } from "./dto/update-user-profile.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  getMe(@CurrentUser("sub") userId: string) {
    return this.usersService.getCurrentUserProfile(userId);
  }

  @Patch("me")
  updateMe(@CurrentUser("sub") userId: string, @Body() payload: UpdateUserProfileDto) {
    return this.usersService.updateCurrentUserProfile(userId, payload);
  }

  @Patch("me/measurements")
  updateMeasurements(@CurrentUser("sub") userId: string, @Body() payload: UpdateBodyMeasurementsDto) {
    return this.usersService.updateMeasurements(userId, payload);
  }
}
