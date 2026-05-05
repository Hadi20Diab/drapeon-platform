import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { IsUUID } from "class-validator";

import { CreateBookingDto } from "./dto/create-booking.dto";
import { BookingsService } from "./bookings.service";

class UserQueryDto {
  @IsUUID()
  userId!: string;
}

@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  createBooking(@Query() query: UserQueryDto, @Body() payload: CreateBookingDto) {
    return this.bookingsService.createBooking(query.userId, payload);
  }

  @Get()
  listUserBookings(@Query() query: UserQueryDto) {
    return this.bookingsService.listUserBookings(query.userId);
  }
}
