import { randomUUID } from "node:crypto";

import { Injectable, NotFoundException } from "@nestjs/common";
import { BookingStatus, DeliveryStatus, DesignerApprovalStatus } from "@prisma/client";

import { StripeConnectService } from "../../integrations/stripe/stripe-connect.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateStoreDto } from "./dto/create-store.dto";

@Injectable()
export class DesignersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeConnectService: StripeConnectService
  ) {}

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
      select: {
        id: true,
        storeName: true,
        approvalStatus: true,
        location: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeDetailsSubmitted: true
      }
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
      stripeAccountId: designer.stripeAccountId,
      stripeOnboardingComplete: designer.stripeOnboardingComplete,
      stripeChargesEnabled: designer.stripeChargesEnabled,
      stripePayoutsEnabled: designer.stripePayoutsEnabled,
      stripeDetailsSubmitted: designer.stripeDetailsSubmitted,
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

  async createStripeOnboardingLink(userId: string) {
    const designer = await this.prisma.designer.findUnique({
      where: { userId },
      select: {
        id: true,
        stripeAccountId: true,
        user: {
          select: {
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!designer) {
      throw new NotFoundException("Designer profile was not found");
    }

    if (!this.stripeConnectService.isConfigured()) {
      return {
        mode: "configuration_required",
        url: null,
        message: "Set STRIPE_SECRET_KEY to create Stripe Connect onboarding links."
      };
    }

    let stripeAccountId = designer.stripeAccountId;

    if (!stripeAccountId) {
      const account = await this.stripeConnectService.createDesignerAccount({
        email: designer.user.email,
        firstName: designer.user.profile?.firstName ?? "Designer",
        lastName: designer.user.profile?.lastName ?? "Studio"
      });
      stripeAccountId = account?.id ?? null;

      await this.prisma.designer.update({
        where: { id: designer.id },
        data: {
          stripeAccountId,
          stripeAccountCreatedAt: stripeAccountId ? new Date() : undefined
        }
      });
    }

    if (!stripeAccountId) {
      return {
        mode: "configuration_required",
        url: null,
        message: "Stripe Connect is not configured yet."
      };
    }

    const onboardingLink = await this.stripeConnectService.createOnboardingLink(stripeAccountId);

    return {
      mode: "stripe_connect_onboarding",
      url: onboardingLink?.url ?? null,
      stripeAccountId
    };
  }

  async refreshStripeStatus(userId: string) {
    const designer = await this.prisma.designer.findUnique({
      where: { userId },
      select: { id: true, stripeAccountId: true }
    });

    if (!designer) {
      throw new NotFoundException("Designer profile was not found");
    }

    if (!designer.stripeAccountId || !this.stripeConnectService.isConfigured()) {
      return null;
    }

    const account = await this.stripeConnectService.retrieveAccount(designer.stripeAccountId);

    if (!account) {
      return null;
    }

    return this.prisma.designer.update({
      where: { id: designer.id },
      data: {
        stripeChargesEnabled: account.charges_enabled ?? false,
        stripePayoutsEnabled: account.payouts_enabled ?? false,
        stripeDetailsSubmitted: account.details_submitted ?? false,
        stripeOnboardingComplete:
          Boolean(account.details_submitted) &&
          Boolean(account.charges_enabled) &&
          Boolean(account.payouts_enabled)
      }
    });
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
