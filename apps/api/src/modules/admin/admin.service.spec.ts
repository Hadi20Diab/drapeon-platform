import { DesignerApprovalStatus, UserStatus } from "@prisma/client";

import { AdminService } from "./admin.service";

describe("AdminService", () => {
  function createService() {
    const prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn()
      },
      designer: {
        findUnique: jest.fn(),
        update: jest.fn()
      },
      adminAuditLog: {
        create: jest.fn()
      },
      refreshToken: {
        updateMany: jest.fn()
      }
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
});
