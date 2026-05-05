import { Injectable } from "@nestjs/common";

import { BookingType, CreateBookingDto } from "./dto/create-booking.dto";

@Injectable()
export class BookingsService {
  createBooking(userId: string, payload: CreateBookingDto) {
    return {
      userId,
      ...payload,
      type: payload.type ?? BookingType.FITTING,
      status: "PENDING"
    };
  }

  listUserBookings(userId: string) {
    return {
      userId,
      bookings: []
    };
  }
}
