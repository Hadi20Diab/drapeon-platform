import { Body, Controller, Get, Patch, Query } from "@nestjs/common";
import { IsUUID } from "class-validator";

import { UpdateBodyMeasurementsDto } from "./dto/update-body-measurements.dto";
import { UsersService } from "./users.service";

class UserQueryDto {
  @IsUUID()
  userId!: string;
}

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  getMe(@Query() query: UserQueryDto) {
    return this.usersService.getCurrentUserProfile(query.userId);
  }

  @Patch("me/measurements")
  updateMeasurements(@Query() query: UserQueryDto, @Body() payload: UpdateBodyMeasurementsDto) {
    return this.usersService.updateMeasurements(query.userId, payload);
  }
}
