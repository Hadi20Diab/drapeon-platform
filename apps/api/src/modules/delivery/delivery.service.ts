import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DeliveryStatus } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthJwtPayload } from "../auth/interfaces/auth-jwt-payload.interface";
import { CreateDeliveryRequestDto } from "./dto/create-delivery-request.dto";
import { UpdateDeliveryStatusDto } from "./dto/update-delivery-status.dto";

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async createDeliveryRequest(userId: string, payload: CreateDeliveryRequestDto) {
    if (!payload.bookingId && !payload.orderId && !payload.productId) {
      throw new BadRequestException("At least one of bookingId, orderId, or productId is required");
    }

    let designerId: string | undefined;
    let bookingId: string | undefined = payload.bookingId;
    let orderId: string | undefined = payload.orderId;
    let productId: string | undefined = payload.productId;

    if (payload.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: payload.bookingId },
        select: { id: true, userId: true, designerId: true, productId: true }
      });

      if (!booking) {
        throw new NotFoundException("Booking not found");
      }

      if (booking.userId !== userId) {
        throw new ForbiddenException("Booking does not belong to the current user");
      }

      designerId = booking.designerId;
      productId ??= booking.productId;
      bookingId = booking.id;
    }

    if (payload.orderId) {
      const order = await this.prisma.rentalOrder.findUnique({
        where: { id: payload.orderId },
        select: { id: true, userId: true, designerId: true }
      });

      if (!order) {
        throw new NotFoundException("Order not found");
      }

      if (order.userId !== userId) {
        throw new ForbiddenException("Order does not belong to the current user");
      }

      designerId ??= order.designerId;
      orderId = order.id;
    }

    if (payload.productId && !designerId) {
      const product = await this.prisma.product.findUnique({
        where: { id: payload.productId },
        select: { id: true, designerId: true }
      });

      if (!product) {
        throw new NotFoundException("Product not found");
      }

      designerId = product.designerId;
      productId = product.id;
    }

    if (!designerId) {
      throw new BadRequestException("Could not infer designer for this delivery request");
    }

    const delivery = await this.prisma.deliveryRequest.create({
      data: {
        userId,
        designerId,
        bookingId,
        orderId,
        productId,
        deliveryAddress: payload.deliveryAddress,
        instructions: payload.notes,
        status: DeliveryStatus.PENDING
      }
    });
    await this.prisma.deliveryTrackingEvent.create({
      data: {
        deliveryRequestId: delivery.id,
        status: DeliveryStatus.PENDING,
        note: "Delivery request created"
      }
    });

    return delivery;
  }

  async listUserDeliveries(userId: string) {
    return this.prisma.deliveryRequest.findMany({
      where: { userId },
      include: {
        trackingEvents: {
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async trackDelivery(
    userId: string,
    role: AuthJwtPayload["role"],
    deliveryRequestId: string
  ) {
    const deliveryRequest = await this.prisma.deliveryRequest.findUnique({
      where: { id: deliveryRequestId },
      include: {
        designer: {
          select: { userId: true, storeName: true }
        },
        trackingEvents: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!deliveryRequest) {
      throw new NotFoundException("Delivery request was not found");
    }

    if (role === "USER" && deliveryRequest.userId !== userId) {
      throw new ForbiddenException("You cannot access this delivery request");
    }

    if (role === "DESIGNER" && deliveryRequest.designer.userId !== userId) {
      throw new ForbiddenException("You cannot access this delivery request");
    }

    return deliveryRequest;
  }

  async updateDeliveryStatus(
    userId: string,
    role: AuthJwtPayload["role"],
    deliveryRequestId: string,
    payload: UpdateDeliveryStatusDto
  ) {
    const deliveryRequest = await this.prisma.deliveryRequest.findUnique({
      where: { id: deliveryRequestId },
      include: {
        designer: {
          select: { userId: true }
        }
      }
    });

    if (!deliveryRequest) {
      throw new NotFoundException("Delivery request was not found");
    }

    if (role === "DESIGNER" && deliveryRequest.designer.userId !== userId) {
      throw new ForbiddenException("You cannot update this delivery request");
    }

    const timestampFields = this.buildStatusTimestamps(payload.status);
    const [updatedDelivery] = await this.prisma.$transaction([
      this.prisma.deliveryRequest.update({
        where: { id: deliveryRequestId },
        data: {
          status: payload.status,
          ...timestampFields
        }
      }),
      this.prisma.deliveryTrackingEvent.create({
        data: {
          deliveryRequestId,
          status: payload.status,
          note: payload.note
        }
      })
    ]);

    return updatedDelivery;
  }

  private buildStatusTimestamps(status: DeliveryStatus) {
    if (status === DeliveryStatus.IN_TRANSIT) {
      return { dispatchedAt: new Date() };
    }

    if (status === DeliveryStatus.DELIVERED) {
      return { deliveredAt: new Date() };
    }

    if (status === DeliveryStatus.CANCELLED) {
      return { cancelledAt: new Date() };
    }

    return {};
  }
}
