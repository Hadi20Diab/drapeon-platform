import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthJwtPayload } from "../auth/interfaces/auth-jwt-payload.interface";
import { CreateDeliveryRequestDto } from "./dto/create-delivery-request.dto";
import { DeliveryService } from "./delivery.service";
import { UpdateDeliveryStatusDto } from "./dto/update-delivery-status.dto";

@Controller("delivery")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Roles(UserRole.USER)
  @Post("requests")
  createDeliveryRequest(@CurrentUser("sub") userId: string, @Body() payload: CreateDeliveryRequestDto) {
    return this.deliveryService.createDeliveryRequest(userId, payload);
  }

  @Roles(UserRole.USER)
  @Get("requests")
  listUserDeliveries(@CurrentUser("sub") userId: string) {
    return this.deliveryService.listUserDeliveries(userId);
  }

  @Roles(UserRole.USER, UserRole.DESIGNER, UserRole.ADMIN)
  @Get("requests/:id")
  trackDelivery(
    @CurrentUser("sub") userId: string,
    @CurrentUser("role") role: AuthJwtPayload["role"],
    @Param("id", new ParseUUIDPipe()) id: string
  ) {
    return this.deliveryService.trackDelivery(userId, role, id);
  }

  @Roles(UserRole.DESIGNER, UserRole.ADMIN)
  @Patch("requests/:id/status")
  updateStatus(
    @CurrentUser("sub") userId: string,
    @CurrentUser("role") role: AuthJwtPayload["role"],
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() payload: UpdateDeliveryStatusDto
  ) {
    return this.deliveryService.updateDeliveryStatus(userId, role, id, payload);
  }
}
