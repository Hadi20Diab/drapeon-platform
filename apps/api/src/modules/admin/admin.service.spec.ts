import {
  BookingStatus,
  DesignerApprovalStatus,
  DesignerSubscriptionStatus,
  SubscriptionInterval,
  UserStatus
} from "@prisma/client";

import { AdminService } from "./admin.service";

describe("AdminService", () => {
  function createService() {
    const prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
      },
      designer: {
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
      },
      designerSubscription: {
        findMany: jest.fn(),
        count: jest.fn()
      },
      product: {
        count: jest.fn(),
        findMany: jest.fn(),
        groupBy: jest.fn()
      },
      booking: {
        count: jest.fn(),
        findMany: jest.fn()
      },
      aiSession: {
        findMany: jest.fn(),
        groupBy: jest.fn()
      },
      aiMessage: {
        findMany: jest.fn()
      },
      adminAuditLog: {
        create: jest.fn(),
        findMany: jest.fn()
      },
      refreshToken: {
        updateMany: jest.fn()
      },
      $transaction: jest.fn()
    } as any;

    return { service: new AdminService(prisma), prisma };
  }

  it("updates user status and writes an audit event", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ id: "user-1" });
    prisma.user.update.mockResolvedValue({ id: "user-1", status: UserStatus.SUSPENDED });

    const result = await service.updateUserStatus("admin-1", "user-1", UserStatus.SUSPENDED);

    expect(result).toEqual({ id: "user-1", status: UserStatus.SUSPENDED });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: UserStatus.SUSPENDED } }));
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: {
        actorAdminId: "admin-1",
        action: "user.suspended",
        targetType: "User",
        targetId: "user-1",
        metadata: { status: UserStatus.SUSPENDED }
      }
    });
  });

  it("revokes active refresh tokens when resetting an account", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ id: "user-1" });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

    await expect(service.resetUserAccount("admin-1", "user-1")).resolves.toEqual({ revokedSessions: true });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: {
        actorAdminId: "admin-1",
        action: "user.account_reset",
        targetType: "User",
        targetId: "user-1",
        metadata: undefined
      }
    });
  });

  it("approves designers with approver metadata and audit logging", async () => {
    const { service, prisma } = createService();
    prisma.designer.findUnique.mockResolvedValue({ id: "designer-1" });
    prisma.designer.update.mockResolvedValue({ id: "designer-1", approvalStatus: DesignerApprovalStatus.APPROVED });

    const result = await service.updateDesignerApproval(
      "admin-1",
      "designer-1",
      DesignerApprovalStatus.APPROVED
    );

    expect(result.approvalStatus).toBe(DesignerApprovalStatus.APPROVED);
    expect(prisma.designer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approvalStatus: DesignerApprovalStatus.APPROVED,
          approvedById: "admin-1",
          approvedAt: expect.any(Date)
        })
      })
    );
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: {
        actorAdminId: "admin-1",
        action: "designer.approved",
        targetType: "Designer",
        targetId: "designer-1",
        metadata: { status: DesignerApprovalStatus.APPROVED }
      }
    });
  });

  it("builds subscription analytics from active plans and fitting activity", async () => {
    const { service, prisma } = createService();
    const createdAt = new Date("2026-05-01T00:00:00.000Z");

    prisma.$transaction.mockResolvedValue([
      [
        {
          createdAt,
          status: DesignerSubscriptionStatus.ACTIVE,
          plan: { amount: 149, interval: SubscriptionInterval.MONTH }
        },
        {
          createdAt,
          status: DesignerSubscriptionStatus.INACTIVE,
          plan: { amount: 79, interval: SubscriptionInterval.MONTH }
        }
      ],
      [{ createdAt }, { createdAt }],
      [
        { category: "DRESS", status: "ACTIVE", _count: { bookings: 3 } },
        { category: "SUIT", status: "ARCHIVED", _count: { bookings: 1 } }
      ],
      [
        { category: "DRESS", _count: { _all: 1 } },
        { category: "SUIT", _count: { _all: 1 } }
      ],
      2,
      4,
      [
        { createdAt, status: BookingStatus.PENDING },
        { createdAt, status: BookingStatus.CONFIRMED }
      ]
    ]);

    const result = await service.getAnalytics({});

    expect(result.conversionMetrics).toEqual({
      signupToFitting: 100,
      designerApprovalRate: 50
    });
    expect(result.productHealth).toEqual({
      active: 1,
      draft: 0,
      archived: 1,
      fittingLinked: 2
    });
    expect(result.fittingPerformance).toEqual(
      expect.arrayContaining([
        { status: BookingStatus.PENDING, count: 1 },
        { status: BookingStatus.CONFIRMED, count: 1 }
      ])
    );
    expect(result.topCategories).toEqual([
      { category: "DRESS", products: 1 },
      { category: "SUIT", products: 1 }
    ]);
    expect(result.revenueTrends.reduce((sum, row) => sum + row.value, 0)).toBe(149);
  });

  it("raises billing and fitting alerts from subscription-era signals", async () => {
    const { service, prisma } = createService();

    prisma.$transaction.mockResolvedValue([
      2,
      3,
      1,
      [{ userId: "user-1", _count: { _all: 6 } }],
      4,
      [{ id: "log-1", action: "designer.approved", targetType: "Designer" }]
    ]);

    const result = await service.getNotifications();

    expect(result.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "billing_attention",
          href: "/admin/payments"
        }),
        expect.objectContaining({
          type: "fitting_requests",
          href: "/admin/operations"
        }),
        expect.objectContaining({
          type: "designer_approval",
          href: "/admin/designers"
        })
      ])
    );
    expect(result.recentAuditLogs).toEqual([{ id: "log-1", action: "designer.approved", targetType: "Designer" }]);
  });
});
