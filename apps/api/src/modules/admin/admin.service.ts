import { Injectable, NotFoundException } from "@nestjs/common";
import {
  BookingStatus,
  DesignerApprovalStatus,
  DesignerSubscriptionStatus,
  Prisma,
  ProductStatus,
  SubscriptionInterval,
  UserStatus
} from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { AdminDateRangeQueryDto } from "./dto/admin-date-range-query.dto";
import { AdminDesignerQueryDto } from "./dto/admin-designer-query.dto";
import { AdminProductQueryDto } from "./dto/admin-product-query.dto";
import { AdminUserQueryDto } from "./dto/admin-user-query.dto";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const today = this.startOfDay(new Date());
    const monthStart = this.monthsAgo(0);
    const previousMonthStart = this.monthsAgo(1);
    const activeSubscriptionStatuses = this.activeSubscriptionStatuses();
    const atRiskSubscriptionStatuses = this.atRiskSubscriptionStatuses();

    const [
      totalUsers,
      activeDesigners,
      activeSubscriptions,
      pendingApprovals,
      fittingsToday,
      platformActivity,
      usersThisMonth,
      usersLastMonth,
      recentActivities,
      pendingDesigners,
      recentUsers,
      subscriptionRevenueRows,
      userRows,
      bookingRows,
      topDesignerRows,
      flaggedProducts,
      atRiskSubscribers
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { status: { not: UserStatus.DELETED } } }),
      this.prisma.designer.count({
        where: {
          approvalStatus: DesignerApprovalStatus.APPROVED,
          subscription: {
            is: {
              status: { in: activeSubscriptionStatuses }
            }
          }
        }
      }),
      this.prisma.designerSubscription.findMany({
        where: {
          status: { in: activeSubscriptionStatuses },
          planId: { not: null }
        },
        select: {
          id: true,
          createdAt: true,
          subscribedAt: true,
          status: true,
          plan: {
            select: {
              name: true,
              amount: true,
              interval: true
            }
          }
        }
      }),
      this.prisma.designer.count({ where: { approvalStatus: DesignerApprovalStatus.PENDING } }),
      this.prisma.booking.count({ where: { startsAt: { gte: today } } }),
      this.prisma.booking.count({ where: { createdAt: { gte: this.daysAgo(30) } } }),
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
      this.prisma.designerSubscription.findMany({
        where: {
          status: { in: activeSubscriptionStatuses },
          planId: { not: null },
          createdAt: { gte: this.monthsAgo(5) }
        },
        orderBy: { createdAt: "asc" },
        select: {
          createdAt: true,
          plan: {
            select: {
              amount: true,
              interval: true
            }
          }
        }
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: this.monthsAgo(5) } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true }
      }),
      this.prisma.booking.findMany({
        where: { createdAt: { gte: this.daysAgo(30) } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true, status: true }
      }),
      this.prisma.designer.findMany({
        where: {
          approvalStatus: DesignerApprovalStatus.APPROVED,
          subscription: {
            is: {
              status: { in: activeSubscriptionStatuses },
              planId: { not: null }
            }
          }
        },
        select: {
          id: true,
          storeName: true,
          location: true,
          _count: {
            select: {
              products: true,
              bookings: true
            }
          },
          subscription: {
            select: {
              status: true,
              plan: {
                select: {
                  name: true,
                  amount: true,
                  interval: true
                }
              }
            }
          }
        }
      }),
      this.prisma.product.count({ where: { status: ProductStatus.ARCHIVED } }),
      this.prisma.designerSubscription.count({
        where: {
          status: { in: atRiskSubscriptionStatuses }
        }
      })
    ]);

    const totalMrr = activeSubscriptions.reduce(
      (sum, subscription) => sum + this.normalizedSubscriptionAmount(subscription.plan?.amount, subscription.plan?.interval),
      0
    );
    const monthRevenueThisMonth = activeSubscriptions
      .filter((subscription) => subscription.createdAt >= monthStart)
      .reduce(
        (sum, subscription) =>
          sum + this.normalizedSubscriptionAmount(subscription.plan?.amount, subscription.plan?.interval),
        0
      );
    const monthRevenueLastMonth = activeSubscriptions
      .filter(
        (subscription) =>
          subscription.createdAt >= previousMonthStart && subscription.createdAt < monthStart
      )
      .reduce(
        (sum, subscription) =>
          sum + this.normalizedSubscriptionAmount(subscription.plan?.amount, subscription.plan?.interval),
        0
      );

    return {
      metrics: {
        totalUsers,
        activeDesigners,
        revenue: Number(totalMrr.toFixed(2)),
        platformRevenue: Number((totalMrr * 12).toFixed(2)),
        fittingsToday,
        pendingApprovals,
        platformActivity
      },
      growth: {
        usersThisMonth,
        usersLastMonth,
        userGrowthRate: this.growthRate(usersThisMonth, usersLastMonth),
        revenueThisMonth: Number(monthRevenueThisMonth.toFixed(2)),
        revenueLastMonth: Number(monthRevenueLastMonth.toFixed(2)),
        revenueGrowthRate: this.growthRate(monthRevenueThisMonth, monthRevenueLastMonth)
      },
      revenueSeries: this.buildMoneySeries(
        subscriptionRevenueRows.map((subscription) => ({
          createdAt: subscription.createdAt,
          totalAmount: this.normalizedSubscriptionAmount(
            subscription.plan?.amount,
            subscription.plan?.interval
          )
        })),
        "totalAmount"
      ),
      userGrowthSeries: this.buildCountSeries(userRows),
      fittingPerformance: this.buildStatusSeries(bookingRows),
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
      topDesigners: this.decorateTopDesigners(topDesignerRows),
      alerts: this.buildAlerts({ pendingApprovals, flaggedProducts, atRiskSubscribers })
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
          _count: { select: { bookings: true, aiSessions: true } },
          designerProfile: {
            select: { id: true, storeName: true, approvalStatus: true }
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
          _count: { select: { products: true, bookings: true } }
        }
      })
    ]);

    return {
      items: designers.map((designer) => ({
        ...designer,
        subscription: this.serializeDesignerSubscription(designer.subscription),
        monthlyRevenue: this.normalizedSubscriptionAmount(
          designer.subscription?.plan?.amount,
          designer.subscription?.plan?.interval
        ),
        annualizedRevenue: Number(
          (
            this.normalizedSubscriptionAmount(
              designer.subscription?.plan?.amount,
              designer.subscription?.plan?.interval
            ) * 12
          ).toFixed(2)
        )
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
    const [bookings, subscriptions, recentProducts, auditLogs] = await this.prisma.$transaction([
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
      this.prisma.designerSubscription.findMany({
        take: 24,
        where: {
          OR: [
            { status: { in: this.atRiskSubscriptionStatuses() } },
            { createdAt: { gte: this.daysAgo(45) } }
          ]
        },
        orderBy: [{ currentPeriodEnd: "asc" }, { createdAt: "desc" }],
        include: {
          designer: {
            select: {
              id: true,
              storeName: true,
              approvalStatus: true,
              user: { select: { email: true } }
            }
          },
          plan: {
            select: {
              name: true,
              amount: true,
              interval: true,
              productLimit: true
            }
          }
        }
      }),
      this.prisma.product.findMany({
        take: 24,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          createdAt: true,
          designer: { select: { storeName: true } },
          _count: { select: { bookings: true } }
        }
      }),
      this.prisma.adminAuditLog.findMany({
        take: 30,
        orderBy: { createdAt: "desc" },
        include: { actorAdmin: { select: { email: true } } }
      })
    ]);

    return {
      bookings,
      subscriptions: subscriptions.map((subscription) => ({
        id: subscription.id,
        status: subscription.status,
        designer: subscription.designer,
        planName: subscription.plan?.name ?? "No plan",
        cycleAmount: subscription.plan ? Number(subscription.plan.amount) : 0,
        interval: subscription.plan?.interval ?? SubscriptionInterval.MONTH,
        monthlyRecurringRevenue: this.normalizedSubscriptionAmount(
          subscription.plan?.amount,
          subscription.plan?.interval
        ),
        productLimit: subscription.productLimitSnapshot ?? subscription.plan?.productLimit ?? 0,
        productsPublishedThisPeriod: subscription.productsPublishedThisPeriod,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        currentPeriodEnd: subscription.currentPeriodEnd,
        createdAt: subscription.createdAt
      })),
      products: recentProducts,
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
    const subscriptions = await this.prisma.designerSubscription.findMany({
      where: this.subscriptionDateWhere(query),
      orderBy: { createdAt: "desc" },
      include: {
        designer: {
          select: {
            id: true,
            storeName: true,
            user: {
              select: {
                email: true
              }
            }
          }
        },
        plan: {
          select: {
            name: true,
            amount: true,
            interval: true,
            productLimit: true
          }
        }
      }
    });

    const subscriptionRows = subscriptions.map((subscription) => {
      const monthlyRecurringRevenue = this.normalizedSubscriptionAmount(
        subscription.plan?.amount,
        subscription.plan?.interval
      );

      return {
        id: subscription.id,
        designerId: subscription.designerId,
        designerName: subscription.designer.storeName,
        designerEmail: subscription.designer.user.email,
        status: subscription.status,
        planName: subscription.plan?.name ?? "No plan",
        interval: subscription.plan?.interval ?? SubscriptionInterval.MONTH,
        amount: subscription.plan ? Number(subscription.plan.amount) : 0,
        monthlyRecurringRevenue,
        productLimit: subscription.productLimitSnapshot ?? subscription.plan?.productLimit ?? 0,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        currentPeriodEnd: subscription.currentPeriodEnd,
        subscribedAt: subscription.subscribedAt,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        createdAt: subscription.createdAt
      };
    });

    const activeSubscriptions = subscriptionRows.filter((subscription) =>
      this.activeSubscriptionStatuses().includes(
        subscription.status as DesignerSubscriptionStatus
      )
    );
    const trialingSubscriptions = subscriptionRows.filter(
      (subscription) => subscription.status === DesignerSubscriptionStatus.TRIALING
    );
    const failedSubscriptions = subscriptionRows.filter((subscription) =>
      this.atRiskSubscriptionStatuses().includes(
        subscription.status as DesignerSubscriptionStatus
      )
    );
    const planMix = new Map<
      string,
      { planName: string; interval: SubscriptionInterval; subscribers: number; monthlyRecurringRevenue: number }
    >();

    for (const subscription of activeSubscriptions) {
      const key = `${subscription.planName}:${subscription.interval}`;
      const current = planMix.get(key) ?? {
        planName: subscription.planName,
        interval: subscription.interval,
        subscribers: 0,
        monthlyRecurringRevenue: 0
      };
      current.subscribers += 1;
      current.monthlyRecurringRevenue += subscription.monthlyRecurringRevenue;
      planMix.set(key, current);
    }

    return {
      summary: {
        activeSubscriptions: activeSubscriptions.length,
        trialingSubscriptions: trialingSubscriptions.length,
        pastDueSubscriptions: failedSubscriptions.length,
        monthlyRecurringRevenue: Number(
          activeSubscriptions
            .reduce((sum, item) => sum + item.monthlyRecurringRevenue, 0)
            .toFixed(2)
        ),
        annualRecurringRevenue: Number(
          (
            activeSubscriptions.reduce(
              (sum, item) => sum + item.monthlyRecurringRevenue,
              0
            ) * 12
          ).toFixed(2)
        )
      },
      subscriptions: subscriptionRows,
      planMix: [...planMix.values()].sort(
        (left, right) => right.monthlyRecurringRevenue - left.monthlyRecurringRevenue
      ),
      failedPayments: failedSubscriptions
    };
  }

  async getAnalytics(query: AdminDateRangeQueryDto) {
    const userWhere = this.userDateRangeWhere(query);
    const bookingWhere = this.bookingDateWhere(query);
    const [subscriptions, users, products, categoryGroups, approvedDesigners, totalDesigners, bookings] =
      await this.prisma.$transaction([
        this.prisma.designerSubscription.findMany({
          where: this.subscriptionDateWhere(query),
          orderBy: { createdAt: "asc" },
          select: {
            createdAt: true,
            status: true,
            plan: { select: { amount: true, interval: true } }
          }
        }),
        this.prisma.user.findMany({
          where: userWhere,
          orderBy: { createdAt: "asc" },
          select: { createdAt: true, role: true }
        }),
        this.prisma.product.findMany({
          select: { category: true, status: true, _count: { select: { bookings: true } } }
        }),
        this.prisma.product.groupBy({
          by: ["category"],
          _count: { _all: true },
          orderBy: { category: "asc" }
        }),
        this.prisma.designer.count({ where: { approvalStatus: DesignerApprovalStatus.APPROVED } }),
        this.prisma.designer.count(),
        this.prisma.booking.findMany({
          where: bookingWhere,
          orderBy: { createdAt: "asc" },
          select: { createdAt: true, status: true }
        })
      ]);
    const conversionBase = Math.max(users.length, 1);
    const activeSubscriptions = subscriptions.filter((subscription) =>
      this.activeSubscriptionStatuses().includes(subscription.status)
    );

    return {
      revenueTrends: this.buildMoneySeries(
        activeSubscriptions.map((subscription) => ({
          createdAt: subscription.createdAt,
          totalAmount: this.normalizedSubscriptionAmount(
            subscription.plan?.amount,
            subscription.plan?.interval
          )
        })),
        "totalAmount"
      ),
      userGrowth: this.buildCountSeries(users),
      fittingPerformance: this.buildStatusSeries(bookings),
      topCategories: categoryGroups.map((group) => ({
        category: group.category,
        products: this.groupCount(group)
      })),
      conversionMetrics: {
        signupToFitting: Number(((bookings.length / conversionBase) * 100).toFixed(1)),
        designerApprovalRate:
          totalDesigners === 0 ? 0 : Number(((approvedDesigners / totalDesigners) * 100).toFixed(1))
      },
      productHealth: {
        active: products.filter((product) => product.status === ProductStatus.ACTIVE).length,
        draft: products.filter((product) => product.status === ProductStatus.DRAFT).length,
        archived: products.filter((product) => product.status === ProductStatus.ARCHIVED).length,
        fittingLinked: products.filter((product) => product._count.bookings > 0).length
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
    const [pendingDesigners, atRiskSubscriptions, archivedProducts, suspiciousAiUsers, pendingBookings, recentAuditLogs] =
      await this.prisma.$transaction([
        this.prisma.designer.count({ where: { approvalStatus: DesignerApprovalStatus.PENDING } }),
        this.prisma.designerSubscription.count({
          where: { status: { in: this.atRiskSubscriptionStatuses() } }
        }),
        this.prisma.product.count({ where: { status: ProductStatus.ARCHIVED } }),
        this.prisma.aiSession.groupBy({
          by: ["userId"],
          _count: { _all: true },
          having: { userId: { _count: { gt: 4 } } },
          orderBy: { _count: { userId: "desc" } }
        }),
        this.prisma.booking.count({ where: { status: BookingStatus.PENDING } }),
        this.prisma.adminAuditLog.findMany({ take: 8, orderBy: { createdAt: "desc" } })
      ]);

    return {
      alerts: [
        ...this.notificationIf(pendingDesigners > 0, "designer_approval", "Designer approvals waiting", `${pendingDesigners} designer stores need review.`, "/admin/designers"),
        ...this.notificationIf(atRiskSubscriptions > 0, "billing_attention", "Subscription issues detected", `${atRiskSubscriptions} designer subscriptions need billing review.`, "/admin/payments"),
        ...this.notificationIf(pendingBookings > 0, "fitting_requests", "Fitting requests waiting", `${pendingBookings} fitting sessions still need attention.`, "/admin/operations"),
        ...this.notificationIf(archivedProducts > 0, "flagged_products", "Product moderation queue", `${archivedProducts} archived listings are available for review.`, "/admin/products"),
        ...this.notificationIf(suspiciousAiUsers.length > 0, "suspicious_activity", "AI usage spike", `${suspiciousAiUsers.length} accounts have elevated AI session volume.`, "/admin/ai")
      ],
      recentAuditLogs
    };
  }

  getSettings() {
    return {
      platform: {
        name: "Drapeon",
        subscriptionModel: "designer_subscriptions",
        defaultCurrency: "USD",
        maintenanceMode: false
      },
      stripe: {
        configured: Boolean(process.env.STRIPE_SECRET_KEY),
        publishableConfigured: Boolean(process.env.STRIPE_PUBLISHABLE_KEY),
        webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
        subscriptionSuccessUrl: process.env.STRIPE_SUBSCRIPTION_SUCCESS_URL ?? null,
        subscriptionCancelUrl: process.env.STRIPE_SUBSCRIPTION_CANCEL_URL ?? null,
        billingPortalReturnUrl: process.env.STRIPE_BILLING_PORTAL_RETURN_URL ?? null
      },
      ai: {
        configured: Boolean(process.env.GEMINI_API_KEY),
        model: process.env.GEMINI_MODEL ?? "gemini-3-flash-preview"
      },
      pinecone: {
        configured: Boolean(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME),
        indexName: process.env.PINECONE_INDEX_NAME ?? null,
        namespace: process.env.PINECONE_NAMESPACE ?? "company-knowledge"
      },
      featureToggles: {
        aiStylist: true,
        designerMessaging: true,
        companyKnowledge: true,
        designerSubscriptions: true,
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

  private subscriptionDateWhere(query: AdminDateRangeQueryDto): Prisma.DesignerSubscriptionWhereInput {
    const createdAt: Prisma.DateTimeFilter<"DesignerSubscription"> = {};
    if (query.from) createdAt.gte = new Date(query.from);
    if (query.to) createdAt.lte = new Date(query.to);
    return Object.keys(createdAt).length > 0 ? { createdAt } : {};
  }

  private bookingDateWhere(query: AdminDateRangeQueryDto): Prisma.BookingWhereInput {
    const createdAt: Prisma.DateTimeFilter<"Booking"> = {};
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
      createdAt: true,
      user: { select: { id: true, email: true, status: true } },
      subscription: {
        select: {
          status: true,
          productLimitSnapshot: true,
          productsPublishedThisPeriod: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          plan: {
            select: {
              id: true,
              name: true,
              amount: true,
              interval: true,
              productLimit: true
            }
          }
        }
      }
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
      _count: { select: { bookings: true } }
    } satisfies Prisma.ProductSelect;
  }

  private serializeProduct<T extends { rentalPrice: Prisma.Decimal; buyPrice: Prisma.Decimal | null }>(product: T) {
    return {
      ...product,
      rentalPrice: Number(product.rentalPrice),
      buyPrice: product.buyPrice ? Number(product.buyPrice) : null
    };
  }

  private decorateTopDesigners(
    rows: Array<{
      id: string;
      storeName: string;
      location: string | null;
      _count: { products: number; bookings: number };
      subscription: {
        status: DesignerSubscriptionStatus;
        plan: {
          name: string;
          amount: Prisma.Decimal;
          interval: SubscriptionInterval;
        } | null;
      } | null;
    }>
  ) {
    return [...rows]
      .map((designer) => {
        const monthlyRevenue = this.normalizedSubscriptionAmount(
          designer.subscription?.plan?.amount,
          designer.subscription?.plan?.interval
        );

        return {
          designerId: designer.id,
          storeName: designer.storeName,
          location: designer.location,
          monthlyRevenue: Number(monthlyRevenue.toFixed(2)),
          annualizedRevenue: Number((monthlyRevenue * 12).toFixed(2)),
          publishedLooks: designer._count.products,
          fittings: designer._count.bookings,
          planName: designer.subscription?.plan?.name ?? null,
          subscriptionStatus:
            designer.subscription?.status ?? DesignerSubscriptionStatus.INACTIVE
        };
      })
      .sort((left, right) => right.monthlyRevenue - left.monthlyRevenue)
      .slice(0, 6);
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

  private buildAlerts(input: { pendingApprovals: number; flaggedProducts: number; atRiskSubscribers: number }) {
    return [
      ...this.notificationIf(input.pendingApprovals > 0, "approval", "Pending approvals", `${input.pendingApprovals} designers need a decision.`, "/admin/designers"),
      ...this.notificationIf(input.flaggedProducts > 0, "moderation", "Moderation review", `${input.flaggedProducts} archived listings are waiting in the queue.`, "/admin/products"),
      ...this.notificationIf(input.atRiskSubscribers > 0, "billing", "Subscription attention", `${input.atRiskSubscribers} designer subscriptions need billing review.`, "/admin/payments")
    ];
  }

  private notificationIf(condition: boolean, type: string, title: string, body: string, href: string) {
    return condition ? [{ id: `${type}-${title}`, type, title, body, href, createdAt: new Date() }] : [];
  }

  private groupCount(row: { _count?: true | { _all?: number } | null }) {
    return typeof row._count === "object" && row._count ? row._count._all ?? 0 : 0;
  }

  private serializeDesignerSubscription(
    subscription:
      | {
          status: DesignerSubscriptionStatus;
          productLimitSnapshot: number | null;
          productsPublishedThisPeriod: number;
          currentPeriodEnd: Date | null;
          cancelAtPeriodEnd: boolean;
          plan: {
            id: string;
            name: string;
            amount: Prisma.Decimal;
            interval: SubscriptionInterval;
            productLimit: number;
          } | null;
        }
      | null
      | undefined
  ) {
    if (!subscription) {
      return {
        status: DesignerSubscriptionStatus.INACTIVE,
        plan: null,
        productLimit: 0,
        productsPublishedThisPeriod: 0,
        productsRemainingThisPeriod: 0,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      };
    }

    const productLimit =
      subscription.productLimitSnapshot ?? subscription.plan?.productLimit ?? 0;

    return {
      status: subscription.status,
      plan: subscription.plan
        ? {
            id: subscription.plan.id,
            name: subscription.plan.name,
            amount: Number(subscription.plan.amount),
            interval: subscription.plan.interval,
            productLimit: subscription.plan.productLimit
          }
        : null,
      productLimit,
      productsPublishedThisPeriod: subscription.productsPublishedThisPeriod,
      productsRemainingThisPeriod: Math.max(
        productLimit - subscription.productsPublishedThisPeriod,
        0
      ),
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
    };
  }

  private normalizedSubscriptionAmount(
    amount: Prisma.Decimal | number | null | undefined,
    interval: SubscriptionInterval | string | null | undefined
  ) {
    const numericAmount = Number(amount ?? 0);

    if (interval === SubscriptionInterval.YEAR) {
      return numericAmount / 12;
    }

    return numericAmount;
  }

  private activeSubscriptionStatuses(): DesignerSubscriptionStatus[] {
    return [
      DesignerSubscriptionStatus.ACTIVE,
      DesignerSubscriptionStatus.TRIALING
    ];
  }

  private atRiskSubscriptionStatuses(): DesignerSubscriptionStatus[] {
    return [
      DesignerSubscriptionStatus.PAST_DUE,
      DesignerSubscriptionStatus.UNPAID,
      DesignerSubscriptionStatus.INCOMPLETE,
      DesignerSubscriptionStatus.INCOMPLETE_EXPIRED
    ];
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
