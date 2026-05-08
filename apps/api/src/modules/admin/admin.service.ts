import { Injectable, NotFoundException } from "@nestjs/common";
import {
  DeliveryStatus,
  DesignerApprovalStatus,
  Prisma,
  ProductStatus,
  RentalOrderStatus,
  UserStatus
} from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { AdminDateRangeQueryDto } from "./dto/admin-date-range-query.dto";
import { AdminDesignerQueryDto } from "./dto/admin-designer-query.dto";
import { AdminProductQueryDto } from "./dto/admin-product-query.dto";
import { AdminUserQueryDto } from "./dto/admin-user-query.dto";

const PLATFORM_FEE_RATE = 0.075;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const today = this.startOfDay(new Date());
    const monthStart = this.monthsAgo(0);
    const previousMonthStart = this.monthsAgo(1);

    const [
      totalUsers,
      activeDesigners,
      pendingApprovals,
      rentalsToday,
      platformActivity,
      revenueAggregate,
      monthRevenueAggregate,
      previousMonthRevenueAggregate,
      usersThisMonth,
      usersLastMonth,
      recentActivities,
      pendingDesigners,
      recentUsers,
      revenueRows,
      userRows,
      rentalRows,
      topDesignerRows,
      flaggedProducts,
      deliveryIssues
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { status: { not: UserStatus.DELETED } } }),
      this.prisma.designer.count({ where: { approvalStatus: DesignerApprovalStatus.APPROVED } }),
      this.prisma.designer.count({ where: { approvalStatus: DesignerApprovalStatus.PENDING } }),
      this.prisma.rentalOrder.count({ where: { createdAt: { gte: today } } }),
      this.prisma.adminAuditLog.count(),
      this.prisma.rentalOrder.aggregate({
        where: this.completedOrderWhere(),
        _sum: { serviceFee: true, totalAmount: true }
      }),
      this.prisma.rentalOrder.aggregate({
        where: { ...this.completedOrderWhere(), createdAt: { gte: monthStart } },
        _sum: { serviceFee: true, totalAmount: true }
      }),
      this.prisma.rentalOrder.aggregate({
        where: { ...this.completedOrderWhere(), createdAt: { gte: previousMonthStart, lt: monthStart } },
        _sum: { serviceFee: true, totalAmount: true }
      }),
      this.prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: previousMonthStart, lt: monthStart } } }),
      this.prisma.adminAuditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { actorAdmin: { select: { email: true } } }
      }),
      this.prisma.designer.findMany({
        where: { approvalStatus: DesignerApprovalStatus.PENDING },
        take: 8,
        orderBy: { createdAt: "desc" },
        select: this.designerListSelect()
      }),
      this.prisma.user.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        select: this.userListSelect()
      }),
      this.prisma.rentalOrder.findMany({
        where: { ...this.completedOrderWhere(), createdAt: { gte: this.monthsAgo(5) } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true, serviceFee: true, totalAmount: true }
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: this.monthsAgo(5) } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true }
      }),
      this.prisma.rentalOrder.findMany({
        where: { createdAt: { gte: this.daysAgo(30) } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true, status: true }
      }),
      this.prisma.rentalOrder.groupBy({
        by: ["designerId"],
        where: this.completedOrderWhere(),
        _sum: { totalAmount: true, serviceFee: true },
        _count: { _all: true },
        orderBy: { _sum: { totalAmount: "desc" } },
        take: 6
      }),
      this.prisma.product.count({ where: { status: ProductStatus.ARCHIVED } }),
      this.prisma.deliveryRequest.count({
        where: { status: { in: [DeliveryStatus.CANCELLED, DeliveryStatus.PENDING] } }
      })
    ]);

    return {
      metrics: {
        totalUsers,
        activeDesigners,
        revenue: Number(revenueAggregate._sum.totalAmount ?? 0),
        platformRevenue: Number(revenueAggregate._sum.serviceFee ?? 0),
        rentalsToday,
        pendingApprovals,
        platformActivity
      },
      growth: {
        usersThisMonth,
        usersLastMonth,
        userGrowthRate: this.growthRate(usersThisMonth, usersLastMonth),
        revenueThisMonth: Number(monthRevenueAggregate._sum.totalAmount ?? 0),
        revenueLastMonth: Number(previousMonthRevenueAggregate._sum.totalAmount ?? 0),
        revenueGrowthRate: this.growthRate(
          Number(monthRevenueAggregate._sum.totalAmount ?? 0),
          Number(previousMonthRevenueAggregate._sum.totalAmount ?? 0)
        )
      },
      revenueSeries: this.buildMoneySeries(revenueRows, "totalAmount"),
      userGrowthSeries: this.buildCountSeries(userRows),
      rentalPerformance: this.buildStatusSeries(rentalRows),
      pendingDesigners,
      recentUsers,
      recentActivities: recentActivities.map((activity) => ({
        id: activity.id,
        action: activity.action,
        targetType: activity.targetType,
        targetId: activity.targetId,
        createdAt: activity.createdAt,
        actorEmail: activity.actorAdmin.email
      })),
      topDesigners: await this.decorateTopDesigners(topDesignerRows),
      alerts: this.buildAlerts({ pendingApprovals, flaggedProducts, deliveryIssues })
    };
  }

  async listUsers(query: AdminUserQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 12, 50);
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: "insensitive" } },
              { profile: { firstName: { contains: query.search, mode: "insensitive" } } },
              { profile: { lastName: { contains: query.search, mode: "insensitive" } } }
            ]
          }
        : {})
    };

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          ...this.userListSelect(),
          _count: { select: { bookings: true, rentalOrders: true, aiSessions: true } },
          designerProfile: {
            select: { id: true, storeName: true, approvalStatus: true, stripeChargesEnabled: true }
          }
        }
      })
    ]);

    return { items: users, pagination: { page, limit, total } };
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        profile: { include: { measurements: true } },
        designerProfile: { select: this.designerListSelect() },
        bookings: {
          take: 8,
          orderBy: { createdAt: "desc" },
          include: { product: { select: { title: true } }, designer: { select: { storeName: true } } }
        },
        rentalOrders: {
          take: 8,
          orderBy: { createdAt: "desc" },
          include: { designer: { select: { storeName: true } } }
        },
        aiSessions: {
          take: 8,
          orderBy: { startedAt: "desc" },
          include: { messages: { take: 3, orderBy: { createdAt: "desc" } } }
        }
      }
    });

    if (!user) {
      throw new NotFoundException("User was not found");
    }

    const auditLogs = await this.prisma.adminAuditLog.findMany({
      where: { targetType: "User", targetId: userId },
      take: 20,
      orderBy: { createdAt: "desc" }
    });

    return { ...user, auditLogs };
  }

  async updateUserStatus(adminId: string, userId: string, status: UserStatus) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });

    if (!user) {
      throw new NotFoundException("User was not found");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: this.userListSelect()
    });

    await this.audit(adminId, `user.${status.toLowerCase()}`, "User", userId, { status });

    return updated;
  }

  async resetUserAccount(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });

    if (!user) {
      throw new NotFoundException("User was not found");
    }

    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    await this.audit(adminId, "user.account_reset", "User", userId);

    return { revokedSessions: true };
  }

  async listDesigners(query: AdminDesignerQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 12, 50);
    const where: Prisma.DesignerWhereInput = {
      ...(query.approvalStatus ? { approvalStatus: query.approvalStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { storeName: { contains: query.search, mode: "insensitive" } },
              { location: { contains: query.search, mode: "insensitive" } },
              { user: { email: { contains: query.search, mode: "insensitive" } } }
            ]
          }
        : {})
    };

    const [total, designers] = await this.prisma.$transaction([
      this.prisma.designer.count({ where }),
      this.prisma.designer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          ...this.designerListSelect(),
          _count: { select: { products: true, rentalOrders: true, bookings: true } },
          rentalOrders: {
            where: this.completedOrderWhere(),
            select: { totalAmount: true, serviceFee: true }
          }
        }
      })
    ]);

    return {
      items: designers.map((designer) => ({
        ...designer,
        revenue: designer.rentalOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0),
        platformFees: designer.rentalOrders.reduce((sum, order) => sum + Number(order.serviceFee), 0),
        rentalOrders: undefined
      })),
      pagination: { page, limit, total }
    };
  }

  async updateDesignerApproval(adminId: string, designerId: string, status: DesignerApprovalStatus) {
    const designer = await this.prisma.designer.findUnique({
      where: { id: designerId },
      select: { id: true }
    });

    if (!designer) {
      throw new NotFoundException("Designer was not found");
    }

    const updated = await this.prisma.designer.update({
      where: { id: designerId },
      data: {
        approvalStatus: status,
        approvedAt: status === DesignerApprovalStatus.APPROVED ? new Date() : null,
        approvedById: status === DesignerApprovalStatus.APPROVED ? adminId : null
      },
      select: this.designerListSelect()
    });

    await this.audit(adminId, `designer.${status.toLowerCase()}`, "Designer", designerId, { status });

    return updated;
  }

  approveDesigner(adminId: string, designerId: string) {
    return this.updateDesignerApproval(adminId, designerId, DesignerApprovalStatus.APPROVED);
  }

  async listProducts(query: AdminProductQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 12, 50);
    const where: Prisma.ProductWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
              { designer: { storeName: { contains: query.search, mode: "insensitive" } } }
            ]
          }
        : {})
    };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: this.adminProductSelect()
      })
    ]);

    return { items: products.map((product) => this.serializeProduct(product)), pagination: { page, limit, total } };
  }

  async updateProductStatus(adminId: string, productId: string, status: ProductStatus) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });

    if (!product) {
      throw new NotFoundException("Product was not found");
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { status },
      select: this.adminProductSelect()
    });

    await this.audit(adminId, `product.${status.toLowerCase()}`, "Product", productId, { status });

    return this.serializeProduct(updated);
  }

  async getOperations() {
    const [orders, bookings, deliveries, auditLogs] = await this.prisma.$transaction([
      this.prisma.rentalOrder.findMany({
        take: 30,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
          designer: { select: { storeName: true } },
          deliveryRequest: { select: { status: true, scheduledFor: true } },
          items: {
            take: 3,
            include: { product: { select: { title: true } }, variant: { select: { sizeLabel: true, color: true } } }
          }
        }
      }),
      this.prisma.booking.findMany({
        take: 30,
        orderBy: { startsAt: "asc" },
        include: {
          user: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
          designer: { select: { storeName: true } },
          product: { select: { title: true } },
          variant: { select: { sizeLabel: true, color: true } }
        }
      }),
      this.prisma.deliveryRequest.findMany({
        take: 30,
        orderBy: { requestedAt: "desc" },
        include: {
          user: { select: { email: true } },
          designer: { select: { storeName: true } },
          product: { select: { title: true } },
          trackingEvents: { take: 4, orderBy: { createdAt: "desc" } }
        }
      }),
      this.prisma.adminAuditLog.findMany({
        take: 30,
        orderBy: { createdAt: "desc" },
        include: { actorAdmin: { select: { email: true } } }
      })
    ]);

    return {
      orders: orders.map((order) => ({ ...order, totalAmount: Number(order.totalAmount) })),
      bookings,
      deliveries,
      timeline: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        actorEmail: log.actorAdmin.email,
        createdAt: log.createdAt
      }))
    };
  }

  async getPayments(query: AdminDateRangeQueryDto) {
    const orders = await this.prisma.rentalOrder.findMany({
      where: this.dateRangeWhere(query),
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true } },
        designer: {
          select: {
            id: true,
            storeName: true,
            stripeAccountId: true,
            stripePayoutsEnabled: true
          }
        }
      }
    });

    const transactions = orders.map((order) => {
      const totalAmount = Number(order.totalAmount);
      const platformFee = Number(order.serviceFee);

      return {
        id: order.id,
        customerEmail: order.user.email,
        designerId: order.designerId,
        designerName: order.designer.storeName,
        status: this.paymentStatus(order.status),
        orderStatus: order.status,
        amount: totalAmount,
        platformFee,
        designerAmount: Math.max(totalAmount - platformFee, 0),
        currency: "USD",
        stripeConnected: Boolean(order.designer.stripeAccountId),
        stripePayoutsEnabled: order.designer.stripePayoutsEnabled,
        createdAt: order.createdAt
      };
    });

    const payouts = new Map<string, { designerId: string; designerName: string; available: number; pending: number; stripeReady: boolean }>();
    for (const transaction of transactions) {
      const current = payouts.get(transaction.designerId) ?? {
        designerId: transaction.designerId,
        designerName: transaction.designerName,
        available: 0,
        pending: 0,
        stripeReady: transaction.stripePayoutsEnabled
      };
      if (transaction.status === "paid") current.available += transaction.designerAmount;
      if (transaction.status === "pending") current.pending += transaction.designerAmount;
      payouts.set(transaction.designerId, current);
    }

    return {
      summary: {
        grossRevenue: transactions.reduce((sum, item) => sum + item.amount, 0),
        platformRevenue: transactions.reduce((sum, item) => sum + item.platformFee, 0),
        designerPayouts: transactions.reduce((sum, item) => sum + item.designerAmount, 0),
        failedPayments: transactions.filter((item) => item.status === "failed").length,
        commissionRate: PLATFORM_FEE_RATE
      },
      transactions,
      payouts: [...payouts.values()],
      refunds: transactions.filter((item) => item.orderStatus === RentalOrderStatus.CANCELLED),
      failedPayments: transactions.filter((item) => item.status === "failed")
    };
  }

  async getAnalytics(query: AdminDateRangeQueryDto) {
    const orderWhere = this.dateRangeWhere(query);
    const userWhere = this.userDateRangeWhere(query);
    const [orders, users, products, categoryGroups, approvedDesigners, totalDesigners] = await this.prisma.$transaction([
      this.prisma.rentalOrder.findMany({
        where: orderWhere,
        orderBy: { createdAt: "asc" },
        select: { createdAt: true, status: true, totalAmount: true, serviceFee: true }
      }),
      this.prisma.user.findMany({
        where: userWhere,
        orderBy: { createdAt: "asc" },
        select: { createdAt: true, role: true }
      }),
      this.prisma.product.findMany({
        select: { category: true, status: true, _count: { select: { orderItems: true, bookings: true } } }
      }),
      this.prisma.product.groupBy({
        by: ["category"],
        _count: { _all: true },
        orderBy: { category: "asc" }
      }),
      this.prisma.designer.count({ where: { approvalStatus: DesignerApprovalStatus.APPROVED } }),
      this.prisma.designer.count()
    ]);
    const confirmedOrders = orders.filter((order) => order.status !== RentalOrderStatus.CANCELLED);
    const conversionBase = Math.max(users.length, 1);

    return {
      revenueTrends: this.buildMoneySeries(confirmedOrders, "totalAmount"),
      platformFeeTrends: this.buildMoneySeries(confirmedOrders, "serviceFee"),
      userGrowth: this.buildCountSeries(users),
      rentalPerformance: this.buildStatusSeries(orders),
      topCategories: categoryGroups.map((group) => ({
        category: group.category,
        products: this.groupCount(group)
      })),
      conversionMetrics: {
        signupToRental: Number(((confirmedOrders.length / conversionBase) * 100).toFixed(1)),
        designerApprovalRate:
          totalDesigners === 0 ? 0 : Number(((approvedDesigners / totalDesigners) * 100).toFixed(1))
      },
      productHealth: {
        active: products.filter((product) => product.status === ProductStatus.ACTIVE).length,
        draft: products.filter((product) => product.status === ProductStatus.DRAFT).length,
        archived: products.filter((product) => product.status === ProductStatus.ARCHIVED).length,
        rentalLinked: products.filter((product) => product._count.orderItems > 0).length
      }
    };
  }

  async getAiMonitoring(query: AdminUserQueryDto) {
    const where: Prisma.AiSessionWhereInput = query.search
      ? { user: { email: { contains: query.search, mode: "insensitive" } } }
      : {};
    const [sessions, messages, groupedUsers] = await this.prisma.$transaction([
      this.prisma.aiSession.findMany({
        where,
        take: Math.min(query.limit ?? 30, 80),
        orderBy: { startedAt: "desc" },
        include: {
          user: { select: { id: true, email: true, role: true } },
          messages: { take: 5, orderBy: { createdAt: "desc" } }
        }
      }),
      this.prisma.aiMessage.findMany({
        take: 80,
        orderBy: { createdAt: "desc" },
        include: { session: { include: { user: { select: { email: true } } } } }
      }),
      this.prisma.aiSession.groupBy({
        by: ["userId"],
        _count: { _all: true },
        orderBy: { _count: { userId: "desc" } },
        take: 8
      })
    ]);
    const userIds = groupedUsers.map((user) => user.userId).filter((id): id is string => Boolean(id));
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } });
    const emailById = new Map(users.map((user) => [user.id, user.email]));
    const estimatedTokens = messages.reduce((sum, message) => sum + Math.ceil(message.content.length / 4), 0);

    return {
      usage: {
        sessions: sessions.length,
        messages: messages.length,
        estimatedTokens,
        failedResponses: messages.filter((message) => /error|failed|exception/i.test(message.content)).length
      },
      sessions: sessions.map((session) => ({
        id: session.id,
        channel: session.channel,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        user: session.user,
        messages: session.messages,
        estimatedTokens: session.messages.reduce((sum, message) => sum + Math.ceil(message.content.length / 4), 0)
      })),
      promptLogs: messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        toolName: message.toolName,
        createdAt: message.createdAt,
        userEmail: message.session.user?.email ?? "Guest"
      })),
      abuseSignals: groupedUsers
        .map((user) => ({
          userId: user.userId,
          email: user.userId ? emailById.get(user.userId) ?? "Unknown" : "Guest",
          sessions: this.groupCount(user)
        }))
        .filter((user) => user.sessions >= 5)
    };
  }

  async getNotifications() {
    const [pendingDesigners, failedOrders, archivedProducts, suspiciousAiUsers, recentAuditLogs] = await this.prisma.$transaction([
      this.prisma.designer.count({ where: { approvalStatus: DesignerApprovalStatus.PENDING } }),
      this.prisma.rentalOrder.count({ where: { status: RentalOrderStatus.CANCELLED } }),
      this.prisma.product.count({ where: { status: ProductStatus.ARCHIVED } }),
      this.prisma.aiSession.groupBy({
        by: ["userId"],
        _count: { _all: true },
        having: { userId: { _count: { gt: 4 } } },
        orderBy: { _count: { userId: "desc" } }
      }),
      this.prisma.adminAuditLog.findMany({ take: 8, orderBy: { createdAt: "desc" } })
    ]);

    return {
      alerts: [
        ...this.notificationIf(pendingDesigners > 0, "designer_approval", "Designer approvals waiting", `${pendingDesigners} designer stores need review.`, "/admin/designers"),
        ...this.notificationIf(failedOrders > 0, "payment_failure", "Payment exceptions detected", `${failedOrders} cancelled orders should be checked.`, "/admin/payments"),
        ...this.notificationIf(archivedProducts > 0, "flagged_products", "Product moderation queue", `${archivedProducts} archived listings are available for review.`, "/admin/products"),
        ...this.notificationIf(suspiciousAiUsers.length > 0, "suspicious_activity", "AI usage spike", `${suspiciousAiUsers.length} accounts have elevated AI session volume.`, "/admin/ai")
      ],
      recentAuditLogs
    };
  }

  getSettings() {
    return {
      platform: {
        name: "Vesture",
        commissionRate: PLATFORM_FEE_RATE,
        defaultCurrency: "USD",
        maintenanceMode: false
      },
      stripe: {
        configured: Boolean(process.env.STRIPE_SECRET_KEY),
        publishableConfigured: Boolean(process.env.STRIPE_PUBLISHABLE_KEY),
        connectReturnUrl: process.env.STRIPE_CONNECT_RETURN_URL ?? null,
        webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET)
      },
      ai: {
        configured: Boolean(process.env.GEMINI_API_KEY),
        model: process.env.GEMINI_MODEL ?? "gemini-3-flash-preview"
      },
      featureToggles: {
        aiStylist: true,
        designerMessaging: true,
        stripeConnect: true,
        productModeration: true
      }
    };
  }

  private async audit(adminId: string, action: string, targetType: string, targetId?: string, metadata?: Record<string, unknown>) {
    await this.prisma.adminAuditLog.create({
      data: {
        actorAdminId: adminId,
        action,
        targetType,
        targetId,
        metadata: metadata as Prisma.InputJsonValue
      }
    });
  }

  private completedOrderWhere(): Prisma.RentalOrderWhereInput {
    return { status: { notIn: [RentalOrderStatus.CANCELLED, RentalOrderStatus.PENDING] } };
  }

  private dateRangeWhere(query: AdminDateRangeQueryDto): Prisma.RentalOrderWhereInput {
    const createdAt: Prisma.DateTimeFilter = {};
    if (query.from) createdAt.gte = new Date(query.from);
    if (query.to) createdAt.lte = new Date(query.to);
    return Object.keys(createdAt).length > 0 ? { createdAt } : {};
  }

  private userDateRangeWhere(query: AdminDateRangeQueryDto): Prisma.UserWhereInput {
    const createdAt: Prisma.DateTimeFilter<"User"> = {};
    if (query.from) createdAt.gte = new Date(query.from);
    if (query.to) createdAt.lte = new Date(query.to);
    return Object.keys(createdAt).length > 0 ? { createdAt } : {};
  }

  private designerListSelect() {
    return {
      id: true,
      storeName: true,
      slug: true,
      bio: true,
      location: true,
      brandColor: true,
      approvalStatus: true,
      stripeAccountId: true,
      stripeOnboardingComplete: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      stripeDetailsSubmitted: true,
      createdAt: true,
      user: { select: { id: true, email: true, status: true } }
    } satisfies Prisma.DesignerSelect;
  }

  private userListSelect() {
    return {
      id: true,
      email: true,
      role: true,
      status: true,
      isEmailVerified: true,
      createdAt: true,
      profile: { select: { firstName: true, lastName: true, phoneNumber: true, avatarUrl: true } }
    } satisfies Prisma.UserSelect;
  }

  private adminProductSelect() {
    return {
      id: true,
      title: true,
      category: true,
      status: true,
      rentalPrice: true,
      buyPrice: true,
      createdAt: true,
      tags: true,
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, altText: true } },
      designer: { select: { id: true, storeName: true, approvalStatus: true } },
      _count: { select: { orderItems: true, bookings: true } }
    } satisfies Prisma.ProductSelect;
  }

  private serializeProduct<T extends { rentalPrice: Prisma.Decimal; buyPrice: Prisma.Decimal | null }>(product: T) {
    return {
      ...product,
      rentalPrice: Number(product.rentalPrice),
      buyPrice: product.buyPrice ? Number(product.buyPrice) : null
    };
  }

  private async decorateTopDesigners(
    rows: Array<{
      designerId: string;
      _sum?: { totalAmount?: Prisma.Decimal | null; serviceFee?: Prisma.Decimal | null } | null;
      _count?: true | { _all?: number } | null;
    }>
  ) {
    const designers = await this.prisma.designer.findMany({
      where: { id: { in: rows.map((row) => row.designerId) } },
      select: { id: true, storeName: true, location: true, stripePayoutsEnabled: true }
    });
    const designerById = new Map(designers.map((designer) => [designer.id, designer]));

    return rows.map((row) => {
      const designer = designerById.get(row.designerId);
      return {
        designerId: row.designerId,
        storeName: designer?.storeName ?? "Unknown designer",
        location: designer?.location ?? null,
        revenue: Number(row._sum?.totalAmount ?? 0),
        platformFees: Number(row._sum?.serviceFee ?? 0),
        rentals: this.groupCount(row),
        stripePayoutsEnabled: designer?.stripePayoutsEnabled ?? false
      };
    });
  }

  private buildMoneySeries(rows: Array<{ createdAt: Date } & Record<string, unknown>>, field: string) {
    const months = this.monthBuckets(6);
    for (const row of rows) {
      const bucket = months.get(this.monthKey(row.createdAt));
      if (bucket) bucket.value += Number(row[field] ?? 0);
    }
    return [...months.values()].map((bucket) => ({ month: bucket.label, value: Number(bucket.value.toFixed(2)) }));
  }

  private buildCountSeries(rows: Array<{ createdAt: Date }>) {
    const months = this.monthBuckets(6);
    for (const row of rows) {
      const bucket = months.get(this.monthKey(row.createdAt));
      if (bucket) bucket.value += 1;
    }
    return [...months.values()].map((bucket) => ({ month: bucket.label, value: bucket.value }));
  }

  private buildStatusSeries(rows: Array<{ status: string }>) {
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
    return [...counts.entries()].map(([status, count]) => ({ status, count }));
  }

  private monthBuckets(count: number) {
    const buckets = new Map<string, { label: string; value: number }>();
    for (let index = count - 1; index >= 0; index -= 1) {
      const date = new Date();
      date.setMonth(date.getMonth() - index, 1);
      date.setHours(0, 0, 0, 0);
      buckets.set(this.monthKey(date), {
        label: date.toLocaleString("en", { month: "short" }),
        value: 0
      });
    }
    return buckets;
  }

  private buildAlerts(input: { pendingApprovals: number; flaggedProducts: number; deliveryIssues: number }) {
    return [
      ...this.notificationIf(input.pendingApprovals > 0, "approval", "Pending approvals", `${input.pendingApprovals} designers need a decision.`, "/admin/designers"),
      ...this.notificationIf(input.flaggedProducts > 0, "moderation", "Moderation review", `${input.flaggedProducts} archived listings are waiting in the queue.`, "/admin/products"),
      ...this.notificationIf(input.deliveryIssues > 0, "operations", "Delivery attention", `${input.deliveryIssues} deliveries need operations review.`, "/admin/operations")
    ];
  }

  private notificationIf(condition: boolean, type: string, title: string, body: string, href: string) {
    return condition ? [{ id: `${type}-${title}`, type, title, body, href, createdAt: new Date() }] : [];
  }

  private paymentStatus(status: RentalOrderStatus) {
    if (status === RentalOrderStatus.CANCELLED) return "failed";
    if (status === RentalOrderStatus.PENDING) return "pending";
    return "paid";
  }

  private groupCount(row: { _count?: true | { _all?: number } | null }) {
    return typeof row._count === "object" && row._count ? row._count._all ?? 0 : 0;
  }

  private growthRate(current: number, previous: number) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  private monthKey(date: Date) {
    return `${date.getFullYear()}-${date.getMonth()}`;
  }

  private monthsAgo(months: number) {
    const date = new Date();
    date.setMonth(date.getMonth() - months, 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private daysAgo(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private startOfDay(date: Date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
  }
}
