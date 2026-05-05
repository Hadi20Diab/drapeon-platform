import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { BookingStatus, BookingType, ProductStatus } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { UpdateBookingStatusDto } from "./dto/update-booking-status.dto";

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async createBooking(userId: string, payload: CreateBookingDto) {
    if (payload.endsAt <= payload.startsAt) {
      throw new BadRequestException("Booking end time must be after start time");
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id: payload.productId,
        status: ProductStatus.ACTIVE
      },
      select: {
        id: true,
        designerId: true
      }
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    if (product.designerId !== payload.designerId) {
      throw new BadRequestException("Designer does not own this product");
    }

    return this.prisma.booking.create({
      data: {
        userId,
        designerId: payload.designerId,
        productId: payload.productId,
        variantId: payload.variantId,
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        type: payload.type ?? BookingType.FITTING,
        status: BookingStatus.PENDING
      },
      include: {
        product: {
          include: {
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" }
            }
          }
        },
        designer: {
          select: {
            id: true,
            storeName: true,
            slug: true
          }
        }
      }
    });
  }

  async listUserBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" }
            }
          }
        },
        designer: {
          select: {
            id: true,
            storeName: true
          }
        }
      },
      orderBy: {
        startsAt: "desc"
      }
    });
  }

  async listDesignerBookings(userId: string) {
    const designer = await this.prisma.designer.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!designer) {
      throw new NotFoundException("Designer profile was not found");
    }

    return this.prisma.booking.findMany({
      where: { designerId: designer.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        product: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        startsAt: "asc"
      }
    });
  }

  async updateBookingStatus(userId: string, bookingId: string, payload: UpdateBookingStatusDto) {
    const designer = await this.prisma.designer.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!designer) {
      throw new NotFoundException("Designer profile was not found");
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, designerId: true }
    });

    if (!booking) {
      throw new NotFoundException("Booking was not found");
    }

    if (booking.designerId !== designer.id) {
      throw new ForbiddenException("You cannot update this booking");
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: payload.status,
        approvedAt: payload.status === BookingStatus.CONFIRMED ? new Date() : null,
        notes: payload.notes
      }
    });
  }
}
