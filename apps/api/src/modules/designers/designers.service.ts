import { randomUUID } from "node:crypto";

import { Injectable, NotFoundException } from "@nestjs/common";
import { BookingStatus, DeliveryStatus, DesignerApprovalStatus } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { CreateStoreDto } from "./dto/create-store.dto";

@Injectable()
export class DesignersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrUpdateStore(userId: string, payload: CreateStoreDto) {
    const baseSlug = this.toSlug(payload.storeName);
    const existingByUser = await this.prisma.designer.findUnique({
      where: { userId },
      select: { id: true, slug: true }
    });
    const slug = existingByUser?.slug ?? (await this.resolveUniqueSlug(baseSlug));

    return this.prisma.designer.upsert({
      where: { userId },
      create: {
        userId,
        storeName: payload.storeName,
        slug,
        bio: payload.description,
        location: payload.location,
        approvalStatus: DesignerApprovalStatus.PENDING
      },
      update: {
        storeName: payload.storeName,
        bio: payload.description,
        location: payload.location
      }
    });
  }

  async getDashboard(userId: string) {
    const designer = await this.prisma.designer.findUnique({
      where: { userId },
      select: { id: true, storeName: true, approvalStatus: true, location: true }
    });

    if (!designer) {
      throw new NotFoundException("Designer profile was not found");
    }

    const [
      productsCount,
      pendingAppointments,
      openDeliveries,
      rentalOrdersCount,
      products,
      orders,
      appointments,
      deliveries
    ] = await this.prisma.$transaction([
      this.prisma.product.count({
        where: { designerId: designer.id }
      }),
      this.prisma.booking.count({
        where: {
          designerId: designer.id,
          status: {
            in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
          }
        }
      }),
      this.prisma.deliveryRequest.count({
        where: {
          designerId: designer.id,
          status: {
            in: [
              DeliveryStatus.PENDING,
              DeliveryStatus.APPROVED,
              DeliveryStatus.PACKING,
              DeliveryStatus.IN_TRANSIT
            ]
          }
        }
      }),
      this.prisma.rentalOrder.count({
        where: { designerId: designer.id }
      }),
      this.prisma.product.findMany({
        where: { designerId: designer.id },
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          rentalPrice: true,
          variants: {
            select: {
              sizeLabel: true,
              color: true,
              stockTotal: true,
              stockReserved: true
            }
          }
        }
      }),
      this.prisma.rentalOrder.findMany({
        where: { designerId: designer.id },
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          rentalStartDate: true,
          rentalEndDate: true,
          user: {
            select: {
              email: true
            }
          }
        }
      }),
      this.prisma.booking.findMany({
        where: { designerId: designer.id },
        take: 6,
        orderBy: { startsAt: "asc" },
        select: {
          id: true,
          status: true,
          startsAt: true,
          endsAt: true,
          product: {
            select: {
              title: true
            }
          },
          user: {
            select: {
              email: true
            }
          }
        }
      }),
      this.prisma.deliveryRequest.findMany({
        where: { designerId: designer.id },
        take: 6,
        orderBy: { requestedAt: "desc" },
        select: {
          id: true,
          status: true,
          deliveryAddress: true,
          scheduledFor: true,
          user: {
            select: {
              email: true
            }
          }
        }
      })
    ]);

    return {
      designerId: designer.id,
      storeName: designer.storeName,
      approvalStatus: designer.approvalStatus,
      location: designer.location,
      productsCount,
      pendingAppointments,
      openDeliveries,
      rentalOrdersCount,
      estimatedCommissionRate: 0.075,
      products,
      orders,
      appointments,
      deliveries
    };
  }

  async getDesignerIdByUserId(userId: string): Promise<string> {
    const designer = await this.prisma.designer.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!designer) {
      throw new NotFoundException("Designer profile was not found");
    }

    return designer.id;
  }

  private async resolveUniqueSlug(baseSlug: string): Promise<string> {
    const existing = await this.prisma.designer.findUnique({
      where: { slug: baseSlug },
      select: { id: true }
    });

    if (!existing) {
      return baseSlug;
    }

    return `${baseSlug}-${randomUUID().slice(0, 8)}`;
  }

  private toSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
  }
}
