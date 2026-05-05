import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { IsUUID } from "class-validator";

import { CreateDeliveryRequestDto } from "./dto/create-delivery-request.dto";
import { DeliveryService } from "./delivery.service";

class UserQueryDto {
  @IsUUID()
  userId!: string;
}

@Controller("delivery")
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post("requests")
  createDeliveryRequest(@Query() query: UserQueryDto, @Body() payload: CreateDeliveryRequestDto) {
    return this.deliveryService.createDeliveryRequest(query.userId, payload);
  }

  @Get("requests/:id")
  trackDelivery(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.deliveryService.trackDelivery(id);
  }
}
