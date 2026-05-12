import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { UpdateBookingStatusDto } from "./dto/update-booking-status.dto";
import { BookingsService } from "./bookings.service";

@Controller("bookings")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Roles(UserRole.USER, UserRole.DESIGNER)
  @Post()
  createBooking(@CurrentUser("sub") userId: string, @Body() payload: CreateBookingDto) {
    return this.bookingsService.createBooking(userId, payload);
  }

  @Roles(UserRole.USER, UserRole.DESIGNER)
  @Get("me")
  listUserBookings(@CurrentUser("sub") userId: string) {
    return this.bookingsService.listUserBookings(userId);
  }

  @Roles(UserRole.DESIGNER)
  @Get("designer")
  listDesignerBookings(@CurrentUser("sub") userId: string) {
    return this.bookingsService.listDesignerBookings(userId);
  }

  @Roles(UserRole.DESIGNER)
  @Patch(":id/status")
  updateStatus(
    @CurrentUser("sub") userId: string,
    @Param("id", new ParseUUIDPipe()) bookingId: string,
    @Body() payload: UpdateBookingStatusDto
  ) {
    return this.bookingsService.updateBookingStatus(userId, bookingId, payload);
  }
}
