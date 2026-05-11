import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  AvailabilityStatus,
  BookingStatus,
  DesignerApprovalStatus,
  DesignerNotificationType,
  DesignerSubscriptionStatus,
  MessageSenderRole,
  Prisma,
  ProductStatus,
  RentalOrderStatus,
  SubscriptionInterval
} from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { CreateStoreDto } from "./dto/create-store.dto";
import { DesignerProductDto } from "./dto/designer-product.dto";
import {
  DesignerProductQueryDto,
  DesignerProductSort
} from "./dto/designer-product-query.dto";
import { SendDesignerMessageDto } from "./dto/send-designer-message.dto";
import { UpdateDesignerProductStatusDto } from "./dto/update-designer-product-status.dto";
import { UpdateDesignerSettingsDto } from "./dto/update-designer-settings.dto";
import { UpdateRentalOrderStatusDto } from "./dto/update-rental-order-status.dto";

type DesignerSubscriptionRecord = {
  id: string;
  status: DesignerSubscriptionStatus;
  productLimitSnapshot: number | null;
  productsPublishedThisPeriod: number;
  usagePeriodStart: Date | null;
  usagePeriodEnd: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  subscribedAt: Date | null;
  lastSyncedAt: Date | null;
  plan: {
    id: string;
    slug: string;
    name: string;
    amount: Prisma.Decimal;
    currency: string;
    interval: SubscriptionInterval;
    productLimit: number;
    featured: boolean;
    features: string[];
  } | null;
} | null;

type DesignerRecord = {
  id: string;
  userId: string;
  storeName: string;
  bio: string;
  location: string | null;
  brandColor: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  approvalStatus: DesignerApprovalStatus;
  subscription: DesignerSubscriptionRecord;
};

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
        approvalStatus: DesignerApprovalStatus.PENDING,
        subscription: {
          create: {}
        }
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
    const subscription = await this.ensureSubscriptionWindowCurrent(designer.subscription);

    const [
      productsCount,
      activeProductsCount,
      draftProductsCount,
      pendingAppointments,
      confirmedAppointments,
      products,
      appointments,
      notifications,
      conversations
    ] = await this.prisma.$transaction([
      this.prisma.product.count({ where: { designerId: designer.id } }),
      this.prisma.product.count({
        where: { designerId: designer.id, status: ProductStatus.ACTIVE }
      }),
      this.prisma.product.count({
        where: { designerId: designer.id, status: ProductStatus.DRAFT }
      }),
      this.prisma.booking.count({
        where: {
          designerId: designer.id,
          status: BookingStatus.PENDING
        }
      }),
      this.prisma.booking.count({
        where: {
          designerId: designer.id,
          status: BookingStatus.CONFIRMED
        }
      }),
      this.prisma.product.findMany({
        where: { designerId: designer.id },
        take: 8,
        orderBy: { createdAt: "desc" },
        select: this.productSelect()
      }),
      this.prisma.booking.findMany({
        where: { designerId: designer.id },
        take: 10,
        orderBy: { startsAt: "asc" },
        include: this.bookingInclude()
      }),
      this.prisma.designerNotification.findMany({
        where: { designerId: designer.id },
        take: 8,
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.designerConversation.findMany({
        where: { designerId: designer.id },
        take: 6,
        orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
        include: this.conversationInclude()
      })
    ]);

    return {
      designerId: designer.id,
      storeName: designer.storeName,
      approvalStatus: designer.approvalStatus,
      location: designer.location,
      brandColor: designer.brandColor,
      productsCount,
      activeProductsCount,
      draftProductsCount,
      pendingAppointments,
      confirmedAppointments,
      unreadNotifications: notifications.filter((item) => item.readAt == null).length,
      unreadConversations: conversations.reduce(
        (sum, item) => sum + item.unreadForDesigner,
        0
      ),
      products,
      appointments,
      notifications,
      conversations,
      subscription: this.serializeSubscriptionSummary(subscription)
    };
  }

  async listDesignerProducts(userId: string, query: DesignerProductQueryDto) {
    const designer = await this.getDesignerForUser(userId);
    const subscription = await this.ensureSubscriptionWindowCurrent(designer.subscription);
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
        rentalRevenue: product.orderItems.reduce(
          (sum, item) => sum + Number(item.lineTotal),
          0
        )
      }))
      .sort((a, b) =>
        query.sort === DesignerProductSort.MOST_RENTED ? b.rentalCount - a.rentalCount : 0
      );

    return {
      items: normalized,
      pagination: { page, limit, total },
      subscription: this.serializeSubscriptionSummary(subscription)
    };
  }

  async createDesignerProduct(userId: string, payload: DesignerProductDto) {
    const designer = await this.getDesignerForUser(userId);
    const subscription = await this.ensureSubscriptionWindowCurrent(designer.subscription);
    this.assertSubscriptionReadyForProductCreation(designer, subscription);

    if (!subscription) {
      throw new ForbiddenException(
        "Activate a designer subscription before publishing products."
      );
    }

    const slug = await this.resolveUniqueProductSlug(this.toSlug(payload.title));
    const variants = this.buildVariants(payload);
    const usageWindow = this.resolveUsageWindow(subscription);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          designerId: designer.id,
          category: payload.category,
          title: payload.title,
          slug,
          description: payload.description,
          rentalPrice: new Prisma.Decimal(payload.rentalPrice),
          buyPrice: payload.buyPrice ? new Prisma.Decimal(payload.buyPrice) : undefined,
          tags: payload.tags ?? [],
          bodyShapes: payload.bodyShapes ?? [],
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

      if (subscription) {
        await tx.designerSubscription.update({
          where: { id: subscription.id },
          data: {
            productsPublishedThisPeriod: { increment: 1 },
            usagePeriodStart: usageWindow.start,
            usagePeriodEnd: usageWindow.end,
            currentPeriodStart: usageWindow.start,
            currentPeriodEnd: usageWindow.end,
            lastSyncedAt: new Date()
          }
        });
      }

      return created;
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
          bodyShapes: payload.bodyShapes ?? [],
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

    return this.prisma.product.update({
      where: { id: productId },
      data: { status: payload.status }
    });
  }

  async deleteDesignerProduct(userId: string, productId: string) {
    const designer = await this.getDesignerForUser(userId);
    await this.assertProductOwnership(designer.id, productId);

    return this.prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.ARCHIVED }
    });
  }

  async listRentalOrders(userId: string) {
    const designer = await this.getDesignerForUser(userId);
    return this.prisma.rentalOrder.findMany({
      where: { designerId: designer.id },
      include: this.orderInclude(),
      orderBy: { createdAt: "desc" }
    });
  }

  async updateRentalOrderStatus(
    userId: string,
    orderId: string,
    payload: UpdateRentalOrderStatusDto
  ) {
    const designer = await this.getDesignerForUser(userId);
    const order = await this.prisma.rentalOrder.findUnique({
      where: { id: orderId },
      select: { designerId: true }
    });

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

  async updateAppointmentStatus(
    userId: string,
    bookingId: string,
    status: BookingStatus,
    notes?: string
  ) {
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
        throw new BadRequestException(
          "This slot overlaps an already confirmed appointment"
        );
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
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: { select: { email: true, profile: true } } }
        }
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

  async getDesignerIdByUserId(userId: string): Promise<string> {
    const designer = await this.getDesignerForUser(userId);
    return designer.id;
  }

  private async getDesignerForUser(userId: string): Promise<DesignerRecord> {
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
        subscription: {
          select: {
            id: true,
            status: true,
            productLimitSnapshot: true,
            productsPublishedThisPeriod: true,
            usagePeriodStart: true,
            usagePeriodEnd: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            subscribedAt: true,
            lastSyncedAt: true,
            plan: {
              select: {
                id: true,
                slug: true,
                name: true,
                amount: true,
                currency: true,
                interval: true,
                productLimit: true,
                featured: true,
                features: true
              }
            }
          }
        }
      }
    });

    if (!designer) {
      throw new NotFoundException("Designer profile was not found");
    }

    return designer as DesignerRecord;
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

  private assertSubscriptionReadyForProductCreation(
    designer: DesignerRecord,
    subscription: DesignerSubscriptionRecord
  ) {
    if (designer.approvalStatus === DesignerApprovalStatus.REJECTED) {
      throw new ForbiddenException(
        "This designer account was rejected and cannot publish products."
      );
    }

    if (!subscription || !this.isProductPublishingEnabled(subscription.status)) {
      throw new ForbiddenException(
        "Activate a designer subscription before publishing products."
      );
    }

    const productLimit =
      subscription.productLimitSnapshot ?? subscription.plan?.productLimit ?? 0;

    if (productLimit <= 0) {
      throw new ForbiddenException(
        "This subscription does not include product publishing capacity."
      );
    }

    if (subscription.productsPublishedThisPeriod >= productLimit) {
      throw new ForbiddenException(
        `Your current plan allows ${productLimit} product posts per billing cycle. Upgrade or wait for the next cycle to publish more pieces.`
      );
    }
  }

  private async ensureSubscriptionWindowCurrent(
    subscription: DesignerSubscriptionRecord
  ): Promise<DesignerSubscriptionRecord> {
    if (
      !subscription ||
      !subscription.plan ||
      !this.isProductPublishingEnabled(subscription.status)
    ) {
      return subscription;
    }

    const usageWindow = this.resolveUsageWindow(subscription);

    if (
      subscription.usagePeriodStart?.getTime() === usageWindow.start.getTime() &&
      subscription.usagePeriodEnd?.getTime() === usageWindow.end.getTime()
    ) {
      return subscription;
    }

    const rolledForward = await this.prisma.designerSubscription.update({
      where: { id: subscription.id },
      data: {
        productsPublishedThisPeriod: 0,
        usagePeriodStart: usageWindow.start,
        usagePeriodEnd: usageWindow.end,
        currentPeriodStart: usageWindow.start,
        currentPeriodEnd: usageWindow.end,
        lastSyncedAt: new Date()
      },
      select: {
        id: true,
        status: true,
        productLimitSnapshot: true,
        productsPublishedThisPeriod: true,
        usagePeriodStart: true,
        usagePeriodEnd: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        subscribedAt: true,
        lastSyncedAt: true,
        plan: {
          select: {
            id: true,
            slug: true,
            name: true,
            amount: true,
            currency: true,
            interval: true,
            productLimit: true,
            featured: true,
            features: true
          }
        }
      }
    });

    return rolledForward as DesignerSubscriptionRecord;
  }

  private resolveUsageWindow(subscription: NonNullable<DesignerSubscriptionRecord>) {
    const now = new Date();
    let start =
      subscription.usagePeriodStart ??
      subscription.currentPeriodStart ??
      subscription.subscribedAt ??
      now;
    let end =
      subscription.usagePeriodEnd ??
      subscription.currentPeriodEnd ??
      this.advanceInterval(start, subscription.plan?.interval ?? SubscriptionInterval.MONTH);

    while (end.getTime() <= now.getTime()) {
      start = end;
      end = this.advanceInterval(start, subscription.plan?.interval ?? SubscriptionInterval.MONTH);
    }

    return { start, end };
  }

  private serializeSubscriptionSummary(subscription: DesignerSubscriptionRecord) {
    if (!subscription) {
      return {
        status: DesignerSubscriptionStatus.INACTIVE,
        plan: null,
        canCreateProducts: false,
        needsSubscription: true,
        productLimit: 0,
        productsPublishedThisPeriod: 0,
        productsRemainingThisPeriod: 0,
        usagePeriodStart: null,
        usagePeriodEnd: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        subscribedAt: null,
        lastSyncedAt: null
      };
    }

    const productLimit =
      subscription.productLimitSnapshot ?? subscription.plan?.productLimit ?? 0;
    const remaining = Math.max(productLimit - subscription.productsPublishedThisPeriod, 0);

    return {
      status: subscription.status,
      plan: subscription.plan
        ? {
            ...subscription.plan,
            amount: Number(subscription.plan.amount)
          }
        : null,
      canCreateProducts:
        this.isProductPublishingEnabled(subscription.status) && remaining > 0,
      needsSubscription: !this.isProductPublishingEnabled(subscription.status),
      productLimit,
      productsPublishedThisPeriod: subscription.productsPublishedThisPeriod,
      productsRemainingThisPeriod: remaining,
      usagePeriodStart: subscription.usagePeriodStart,
      usagePeriodEnd: subscription.usagePeriodEnd,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      subscribedAt: subscription.subscribedAt,
      lastSyncedAt: subscription.lastSyncedAt
    };
  }

  private isProductPublishingEnabled(status: DesignerSubscriptionStatus) {
    return (
      status === DesignerSubscriptionStatus.ACTIVE ||
      status === DesignerSubscriptionStatus.TRIALING
    );
  }

  private advanceInterval(date: Date, interval: SubscriptionInterval) {
    const next = new Date(date);

    if (interval === SubscriptionInterval.YEAR) {
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      return next;
    }

    next.setUTCMonth(next.getUTCMonth() + 1);
    return next;
  }

  private async createNotification(
    designerId: string,
    input: {
      type: DesignerNotificationType;
      title: string;
      body: string;
      targetUrl?: string;
    }
  ) {
    return this.prisma.designerNotification.create({ data: { designerId, ...input } });
  }

  private buildVariants(payload: DesignerProductDto) {
    return payload.sizes.flatMap((size) =>
      payload.colors.map((color) => ({ size, color }))
    );
  }

  private productSelect() {
    return {
      id: true,
      title: true,
      status: true,
      rentalPrice: true,
      buyPrice: true,
      tags: true,
      bodyShapes: true,
      images: { take: 1, orderBy: { sortOrder: "asc" as const } },
      variants: {
        select: {
          sizeLabel: true,
          color: true,
          stockTotal: true,
          stockReserved: true
        }
      }
    };
  }

  private orderInclude() {
    return {
      user: { select: { id: true, email: true, profile: true } },
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              images: { take: 1, orderBy: { sortOrder: "asc" as const } }
            }
          },
          variant: { select: { sizeLabel: true, color: true } }
        }
      },
      deliveryRequest: {
        include: { trackingEvents: { orderBy: { createdAt: "asc" as const } } }
      }
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
