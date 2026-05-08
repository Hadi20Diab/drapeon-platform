import { randomUUID } from "node:crypto";

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AvailabilityStatus,
  BookingStatus,
  DeliveryStatus,
  DesignerApprovalStatus,
  DesignerNotificationType,
  MessageSenderRole,
  Prisma,
  ProductStatus,
  RentalOrderStatus
} from "@prisma/client";

import { StripeConnectService } from "../../integrations/stripe/stripe-connect.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateStoreDto } from "./dto/create-store.dto";
import { DesignerProductDto } from "./dto/designer-product.dto";
import { DesignerProductQueryDto, DesignerProductSort } from "./dto/designer-product-query.dto";
import { SendDesignerMessageDto } from "./dto/send-designer-message.dto";
import { UpdateDesignerProductStatusDto } from "./dto/update-designer-product-status.dto";
import { UpdateDesignerSettingsDto } from "./dto/update-designer-settings.dto";
import { UpdateRentalOrderStatusDto } from "./dto/update-rental-order-status.dto";

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
    const designer = await this.getDesignerForUser(userId);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      productsCount,
      pendingAppointments,
      openDeliveries,
      rentalOrdersCount,
      activeRentalsCount,
      revenueAggregate,
      monthRevenueAggregate,
      products,
      orders,
      appointments,
      deliveries,
      mostRentedProducts,
      revenueRows,
      notifications,
      conversations
    ] = await this.prisma.$transaction([
      this.prisma.product.count({ where: { designerId: designer.id } }),
      this.prisma.booking.count({
        where: {
          designerId: designer.id,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] }
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
      this.prisma.rentalOrder.count({ where: { designerId: designer.id } }),
      this.prisma.rentalOrder.count({
        where: {
          designerId: designer.id,
          status: { in: [RentalOrderStatus.CONFIRMED, RentalOrderStatus.IN_PROGRESS, RentalOrderStatus.DELIVERED] }
        }
      }),
      this.prisma.rentalOrder.aggregate({
        where: {
          designerId: designer.id,
          status: { notIn: [RentalOrderStatus.CANCELLED, RentalOrderStatus.PENDING] }
        },
        _sum: { totalAmount: true }
      }),
      this.prisma.rentalOrder.aggregate({
        where: {
          designerId: designer.id,
          createdAt: { gte: startOfMonth },
          status: { notIn: [RentalOrderStatus.CANCELLED, RentalOrderStatus.PENDING] }
        },
        _sum: { totalAmount: true }
      }),
      this.prisma.product.findMany({
        where: { designerId: designer.id },
        take: 8,
        orderBy: { createdAt: "desc" },
        select: this.productSelect()
      }),
      this.prisma.rentalOrder.findMany({
        where: { designerId: designer.id },
        take: 8,
        orderBy: { createdAt: "desc" },
        include: this.orderInclude()
      }),
      this.prisma.booking.findMany({
        where: { designerId: designer.id },
        take: 8,
        orderBy: { startsAt: "asc" },
        include: this.bookingInclude()
      }),
      this.prisma.deliveryRequest.findMany({
        where: { designerId: designer.id },
        take: 8,
        orderBy: { requestedAt: "desc" },
        select: {
          id: true,
          status: true,
          deliveryAddress: true,
          scheduledFor: true,
          user: { select: { email: true } }
        }
      }),
      this.prisma.rentalOrderItem.groupBy({
        by: ["productId"],
        where: { rentalOrder: { designerId: designer.id } },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5
      }),
      this.prisma.rentalOrder.findMany({
        where: {
          designerId: designer.id,
          createdAt: { gte: this.monthsAgo(5) },
          status: { notIn: [RentalOrderStatus.CANCELLED, RentalOrderStatus.PENDING] }
        },
        select: { createdAt: true, totalAmount: true },
        orderBy: { createdAt: "asc" }
      }),
      this.prisma.designerNotification.findMany({
        where: { designerId: designer.id },
        take: 6,
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.designerConversation.findMany({
        where: { designerId: designer.id },
        take: 5,
        orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
        include: this.conversationInclude()
      })
    ]);

    const mostRentedDetails = await this.prisma.product.findMany({
      where: { id: { in: mostRentedProducts.map((item) => item.productId) } },
      select: { id: true, title: true, images: { take: 1, orderBy: { sortOrder: "asc" } } }
    });
    const productById = new Map(mostRentedDetails.map((product) => [product.id, product]));

    return {
      designerId: designer.id,
      storeName: designer.storeName,
      approvalStatus: designer.approvalStatus,
      location: designer.location,
      brandColor: designer.brandColor,
      stripeAccountId: designer.stripeAccountId,
      stripeOnboardingComplete: designer.stripeOnboardingComplete,
      stripeChargesEnabled: designer.stripeChargesEnabled,
      stripePayoutsEnabled: designer.stripePayoutsEnabled,
      stripeDetailsSubmitted: designer.stripeDetailsSubmitted,
      productsCount,
      pendingAppointments,
      openDeliveries,
      rentalOrdersCount,
      activeRentalsCount,
      revenue: Number(revenueAggregate._sum.totalAmount ?? 0),
      monthRevenue: Number(monthRevenueAggregate._sum.totalAmount ?? 0),
      estimatedCommissionRate: this.stripeConnectService.getCommissionRate(),
      products,
      orders,
      appointments,
      deliveries,
      revenueSeries: this.buildRevenueSeries(revenueRows),
      mostRentedProducts: mostRentedProducts.map((item) => {
        const product = productById.get(item.productId);
        return {
          productId: item.productId,
          title: product?.title ?? "Archived product",
          imageUrl: product?.images[0]?.url ?? null,
          rentals: item._sum?.quantity ?? 0,
          revenue: Number(item._sum?.lineTotal ?? 0)
        };
      }),
      notifications,
      conversations
    };
  }

  async listDesignerProducts(userId: string, query: DesignerProductQueryDto) {
    const designer = await this.getDesignerForUser(userId);
    const page = query.page ?? 0;
    const limit = Math.min(query.limit ?? 12, 48);
    const where: Prisma.ProductWhereInput = {
      designerId: designer.id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
              { tags: { has: query.search } }
            ]
          }
        : {})
    };
    const orderBy =
      query.sort === DesignerProductSort.PRICE
        ? { rentalPrice: "desc" as const }
        : { createdAt: "desc" as const };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          variants: { orderBy: [{ sizeLabel: "asc" }, { color: "asc" }] },
          orderItems: { select: { quantity: true, lineTotal: true } }
        },
        skip: page * limit,
        take: limit,
        orderBy
      }),
      this.prisma.product.count({ where })
    ]);

    const normalized = items
      .map((product) => ({
        ...product,
        rentalCount: product.orderItems.reduce((sum, item) => sum + item.quantity, 0),
        rentalRevenue: product.orderItems.reduce((sum, item) => sum + Number(item.lineTotal), 0)
      }))
      .sort((a, b) =>
        query.sort === DesignerProductSort.MOST_RENTED ? b.rentalCount - a.rentalCount : 0
      );

    return { items: normalized, pagination: { page, limit, total } };
  }

  async createDesignerProduct(userId: string, payload: DesignerProductDto) {
    const designer = await this.getDesignerForUser(userId);
    const slug = await this.resolveUniqueProductSlug(this.toSlug(payload.title));
    const variants = this.buildVariants(payload);

    return this.prisma.product.create({
      data: {
        designerId: designer.id,
        category: payload.category,
        title: payload.title,
        slug,
        description: payload.description,
        rentalPrice: new Prisma.Decimal(payload.rentalPrice),
        buyPrice: payload.buyPrice ? new Prisma.Decimal(payload.buyPrice) : undefined,
        tags: payload.tags ?? [],
        status: payload.status ?? ProductStatus.ACTIVE,
        images: {
          create: payload.images.map((url, index) => ({
            url,
            altText: `${payload.title} image ${index + 1}`,
            sortOrder: index
          }))
        },
        variants: {
          create: variants.map((variant) => ({
            sku: `DRP-${randomUUID().slice(0, 8).toUpperCase()}`,
            sizeLabel: variant.size,
            color: variant.color,
            stockTotal: payload.stockQuantity,
            availability: {
              create: (payload.availabilityDates ?? []).map((date) => ({
                date: new Date(date),
                status: AvailabilityStatus.AVAILABLE,
                availableUnits: payload.stockQuantity
              }))
            }
          }))
        }
      },
      include: { images: true, variants: { include: { availability: true } } }
    });
  }

  async updateDesignerProduct(userId: string, productId: string, payload: DesignerProductDto) {
    const designer = await this.getDesignerForUser(userId);
    await this.assertProductOwnership(designer.id, productId);

    return this.prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId } });
      await tx.productAvailability.deleteMany({ where: { variant: { productId } } });
      await tx.productVariant.deleteMany({ where: { productId } });

      return tx.product.update({
        where: { id: productId },
        data: {
          category: payload.category,
          title: payload.title,
          description: payload.description,
          rentalPrice: new Prisma.Decimal(payload.rentalPrice),
          buyPrice: payload.buyPrice ? new Prisma.Decimal(payload.buyPrice) : null,
          tags: payload.tags ?? [],
          status: payload.status ?? ProductStatus.ACTIVE,
          images: {
            create: payload.images.map((url, index) => ({
              url,
              altText: `${payload.title} image ${index + 1}`,
              sortOrder: index
            }))
          },
          variants: {
            create: this.buildVariants(payload).map((variant) => ({
              sku: `DRP-${randomUUID().slice(0, 8).toUpperCase()}`,
              sizeLabel: variant.size,
              color: variant.color,
              stockTotal: payload.stockQuantity,
              availability: {
                create: (payload.availabilityDates ?? []).map((date) => ({
                  date: new Date(date),
                  status: AvailabilityStatus.AVAILABLE,
                  availableUnits: payload.stockQuantity
                }))
              }
            }))
          }
        },
        include: { images: true, variants: true }
      });
    });
  }

  async updateDesignerProductStatus(
    userId: string,
    productId: string,
    payload: UpdateDesignerProductStatusDto
  ) {
    const designer = await this.getDesignerForUser(userId);
    await this.assertProductOwnership(designer.id, productId);
    return this.prisma.product.update({ where: { id: productId }, data: { status: payload.status } });
  }

  async deleteDesignerProduct(userId: string, productId: string) {
    const designer = await this.getDesignerForUser(userId);
    await this.assertProductOwnership(designer.id, productId);
    return this.prisma.product.update({ where: { id: productId }, data: { status: ProductStatus.ARCHIVED } });
  }

  async listRentalOrders(userId: string) {
    const designer = await this.getDesignerForUser(userId);
    return this.prisma.rentalOrder.findMany({
      where: { designerId: designer.id },
      include: this.orderInclude(),
      orderBy: { createdAt: "desc" }
    });
  }

  async updateRentalOrderStatus(userId: string, orderId: string, payload: UpdateRentalOrderStatusDto) {
    const designer = await this.getDesignerForUser(userId);
    const order = await this.prisma.rentalOrder.findUnique({ where: { id: orderId }, select: { designerId: true } });

    if (!order) {
      throw new NotFoundException("Rental order was not found");
    }

    if (order.designerId !== designer.id) {
      throw new ForbiddenException("You cannot update this rental order");
    }

    const updated = await this.prisma.rentalOrder.update({
      where: { id: orderId },
      data: { status: payload.status },
      include: this.orderInclude()
    });

    await this.createNotification(designer.id, {
      type:
        payload.status === RentalOrderStatus.CANCELLED
          ? DesignerNotificationType.ORDER_CANCELLED
          : DesignerNotificationType.ORDER_CREATED,
      title: `Order ${payload.status.toLowerCase()}`,
      body: payload.note ?? `Order ${orderId.slice(0, 8)} moved to ${payload.status}.`,
      targetUrl: "/designers/orders"
    });

    return updated;
  }

  async listAppointments(userId: string) {
    const designer = await this.getDesignerForUser(userId);
    return this.prisma.booking.findMany({
      where: { designerId: designer.id },
      include: this.bookingInclude(),
      orderBy: { startsAt: "asc" }
    });
  }

  async updateAppointmentStatus(userId: string, bookingId: string, status: BookingStatus, notes?: string) {
    const designer = await this.getDesignerForUser(userId);
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { designerId: true, startsAt: true, endsAt: true }
    });

    if (!booking) {
      throw new NotFoundException("Appointment was not found");
    }

    if (booking.designerId !== designer.id) {
      throw new ForbiddenException("You cannot update this appointment");
    }

    if (status === BookingStatus.CONFIRMED) {
      const overlap = await this.prisma.booking.findFirst({
        where: {
          id: { not: bookingId },
          designerId: designer.id,
          status: BookingStatus.CONFIRMED,
          startsAt: { lt: booking.endsAt },
          endsAt: { gt: booking.startsAt }
        },
        select: { id: true }
      });

      if (overlap) {
        throw new BadRequestException("This slot overlaps an already confirmed appointment");
      }
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status,
        notes,
        approvedAt: status === BookingStatus.CONFIRMED ? new Date() : null
      },
      include: this.bookingInclude()
    });

    await this.createNotification(designer.id, {
      type:
        status === BookingStatus.CANCELLED || status === BookingStatus.REJECTED
          ? DesignerNotificationType.APPOINTMENT_CANCELLED
          : DesignerNotificationType.APPOINTMENT_REQUEST,
      title: `Appointment ${status.toLowerCase()}`,
      body: notes ?? `Appointment ${bookingId.slice(0, 8)} moved to ${status}.`,
      targetUrl: "/designers/appointments"
    });

    return updated;
  }

  async listConversations(userId: string) {
    const designer = await this.getDesignerForUser(userId);
    return this.prisma.designerConversation.findMany({
      where: { designerId: designer.id },
      include: this.conversationInclude(),
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }]
    });
  }

  async getConversation(userId: string, conversationId: string) {
    const designer = await this.getDesignerForUser(userId);
    const conversation = await this.prisma.designerConversation.findUnique({
      where: { id: conversationId },
      include: {
        ...this.conversationInclude(),
        messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { email: true, profile: true } } } }
      }
    });

    if (!conversation || conversation.designerId !== designer.id) {
      throw new NotFoundException("Conversation was not found");
    }

    await this.prisma.designerConversation.update({
      where: { id: conversationId },
      data: { unreadForDesigner: 0 }
    });

    return conversation;
  }

  async sendMessage(userId: string, conversationId: string, payload: SendDesignerMessageDto) {
    const designer = await this.getDesignerForUser(userId);
    const conversation = await this.prisma.designerConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, designerId: true }
    });

    if (!conversation || conversation.designerId !== designer.id) {
      throw new NotFoundException("Conversation was not found");
    }

    return this.prisma.$transaction(async (tx) => {
      const message = await tx.designerMessage.create({
        data: {
          conversationId,
          senderId: userId,
          senderRole: MessageSenderRole.DESIGNER,
          body: payload.body
        }
      });
      await tx.designerConversation.update({
        where: { id: conversationId },
        data: { unreadForCustomer: { increment: 1 }, lastMessageAt: new Date() }
      });
      return message;
    });
  }

  async listNotifications(userId: string) {
    const designer = await this.getDesignerForUser(userId);
    return this.prisma.designerNotification.findMany({
      where: { designerId: designer.id },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  }

  async markNotificationRead(userId: string, notificationId: string) {
    const designer = await this.getDesignerForUser(userId);
    const notification = await this.prisma.designerNotification.findUnique({
      where: { id: notificationId },
      select: { designerId: true }
    });

    if (!notification || notification.designerId !== designer.id) {
      throw new NotFoundException("Notification was not found");
    }

    return this.prisma.designerNotification.update({
      where: { id: notificationId },
      data: { readAt: new Date() }
    });
  }

  async updateSettings(userId: string, payload: UpdateDesignerSettingsDto) {
    const designer = await this.getDesignerForUser(userId);
    return this.prisma.designer.update({
      where: { id: designer.id },
      data: {
        storeName: payload.storeName,
        bio: payload.description,
        location: payload.location,
        brandColor: payload.brandColor,
        websiteUrl: payload.websiteUrl,
        instagramUrl: payload.instagramUrl,
        tiktokUrl: payload.tiktokUrl
      }
    });
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
            profile: { select: { firstName: true, lastName: true } }
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
    const designer = await this.getDesignerForUser(userId);
    return designer.id;
  }

  private async getDesignerForUser(userId: string) {
    const designer = await this.prisma.designer.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        storeName: true,
        bio: true,
        location: true,
        brandColor: true,
        websiteUrl: true,
        instagramUrl: true,
        tiktokUrl: true,
        approvalStatus: true,
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

    return designer;
  }

  private async assertProductOwnership(designerId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { designerId: true }
    });

    if (!product) {
      throw new NotFoundException("Product was not found");
    }

    if (product.designerId !== designerId) {
      throw new ForbiddenException("You cannot manage this product");
    }
  }

  private async createNotification(
    designerId: string,
    input: { type: DesignerNotificationType; title: string; body: string; targetUrl?: string }
  ) {
    return this.prisma.designerNotification.create({ data: { designerId, ...input } });
  }

  private buildVariants(payload: DesignerProductDto) {
    return payload.sizes.flatMap((size) => payload.colors.map((color) => ({ size, color })));
  }

  private buildRevenueSeries(rows: Array<{ createdAt: Date; totalAmount: Prisma.Decimal }>) {
    const months = Array.from({ length: 6 }, (_, index) => this.monthKey(this.monthsAgo(5 - index)));
    const totals = new Map(months.map((month) => [month, 0]));

    for (const row of rows) {
      const key = this.monthKey(row.createdAt);
      totals.set(key, (totals.get(key) ?? 0) + Number(row.totalAmount));
    }

    return months.map((month) => ({ month, revenue: totals.get(month) ?? 0 }));
  }

  private monthKey(date: Date): string {
    return date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  }

  private monthsAgo(count: number): Date {
    const date = new Date();
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCMonth(date.getUTCMonth() - count);
    return date;
  }

  private productSelect() {
    return {
      id: true,
      title: true,
      status: true,
      rentalPrice: true,
      buyPrice: true,
      tags: true,
      images: { take: 1, orderBy: { sortOrder: "asc" as const } },
      variants: {
        select: { sizeLabel: true, color: true, stockTotal: true, stockReserved: true }
      }
    };
  }

  private orderInclude() {
    return {
      user: { select: { id: true, email: true, profile: true } },
      items: {
        include: {
          product: { select: { id: true, title: true, images: { take: 1, orderBy: { sortOrder: "asc" as const } } } },
          variant: { select: { sizeLabel: true, color: true } }
        }
      },
      deliveryRequest: { include: { trackingEvents: { orderBy: { createdAt: "asc" as const } } } }
    };
  }

  private bookingInclude() {
    return {
      user: { select: { id: true, email: true, profile: true } },
      product: { select: { id: true, title: true } },
      variant: { select: { sizeLabel: true, color: true } }
    };
  }

  private conversationInclude() {
    return {
      customer: { select: { id: true, email: true, profile: true } },
      messages: { take: 1, orderBy: { createdAt: "desc" as const } }
    };
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

  private async resolveUniqueProductSlug(baseSlug: string): Promise<string> {
    const existing = await this.prisma.product.findUnique({
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
