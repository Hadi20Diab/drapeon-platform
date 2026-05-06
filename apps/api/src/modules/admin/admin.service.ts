import { Injectable, NotFoundException } from "@nestjs/common";
import { DesignerApprovalStatus } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [
      usersCount,
      pendingDesignersCount,
      ordersCount,
      deliveriesCount,
      pendingDesigners,
      recentUsers,
      auditLogs
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.designer.count({
        where: { approvalStatus: DesignerApprovalStatus.PENDING }
      }),
      this.prisma.rentalOrder.count(),
      this.prisma.deliveryRequest.count(),
      this.prisma.designer.findMany({
        where: { approvalStatus: DesignerApprovalStatus.PENDING },
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          storeName: true,
          location: true,
          createdAt: true,
          user: {
            select: {
              email: true
            }
          }
        }
      }),
      this.prisma.user.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true
        }
      }),
      this.prisma.adminAuditLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          createdAt: true
        }
      })
    ]);

    return {
      metrics: {
        usersCount,
        pendingDesignersCount,
        ordersCount,
        deliveriesCount
      },
      pendingDesigners,
      recentUsers,
      auditLogs
    };
  }

  async approveDesigner(adminId: string, designerId: string) {
    const designer = await this.prisma.designer.findUnique({
      where: { id: designerId },
      select: { id: true }
    });

    if (!designer) {
      throw new NotFoundException("Designer was not found");
    }

    const approved = await this.prisma.designer.update({
      where: { id: designerId },
      data: {
        approvalStatus: DesignerApprovalStatus.APPROVED,
        approvedById: adminId,
        approvedAt: new Date()
      }
    });

    await this.prisma.adminAuditLog.create({
      data: {
        actorAdminId: adminId,
        action: "designer.approved",
        targetType: "Designer",
        targetId: designerId
      }
    });

    return approved;
  }
}
