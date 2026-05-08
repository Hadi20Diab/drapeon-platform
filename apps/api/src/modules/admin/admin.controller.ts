import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AdminService } from "./admin.service";
import { AdminDateRangeQueryDto } from "./dto/admin-date-range-query.dto";
import { AdminDesignerQueryDto } from "./dto/admin-designer-query.dto";
import { AdminProductQueryDto } from "./dto/admin-product-query.dto";
import { AdminUserQueryDto } from "./dto/admin-user-query.dto";
import { UpdateAdminProductStatusDto } from "./dto/update-admin-product-status.dto";
import { UpdateDesignerApprovalDto } from "./dto/update-designer-approval.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard")
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get("users")
  listUsers(@Query() query: AdminUserQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get("users/:id")
  getUserProfile(@Param("id", new ParseUUIDPipe()) userId: string) {
    return this.adminService.getUserProfile(userId);
  }

  @Patch("users/:id/status")
  updateUserStatus(
    @CurrentUser("sub") adminId: string,
    @Param("id", new ParseUUIDPipe()) userId: string,
    @Body() payload: UpdateUserStatusDto
  ) {
    return this.adminService.updateUserStatus(adminId, userId, payload.status);
  }

  @Post("users/:id/reset")
  resetUserAccount(
    @CurrentUser("sub") adminId: string,
    @Param("id", new ParseUUIDPipe()) userId: string
  ) {
    return this.adminService.resetUserAccount(adminId, userId);
  }

  @Get("designers")
  listDesigners(@Query() query: AdminDesignerQueryDto) {
    return this.adminService.listDesigners(query);
  }

  @Patch("designers/:id/approval")
  updateDesignerApproval(
    @CurrentUser("sub") adminId: string,
    @Param("id", new ParseUUIDPipe()) designerId: string,
    @Body() payload: UpdateDesignerApprovalDto
  ) {
    return this.adminService.updateDesignerApproval(adminId, designerId, payload.status);
  }

  @Patch("designers/:id/approve")
  approveDesigner(
    @CurrentUser("sub") adminId: string,
    @Param("id", new ParseUUIDPipe()) designerId: string
  ) {
    return this.adminService.approveDesigner(adminId, designerId);
  }

  @Get("products")
  listProducts(@Query() query: AdminProductQueryDto) {
    return this.adminService.listProducts(query);
  }

  @Patch("products/:id/status")
  updateProductStatus(
    @CurrentUser("sub") adminId: string,
    @Param("id", new ParseUUIDPipe()) productId: string,
    @Body() payload: UpdateAdminProductStatusDto
  ) {
    return this.adminService.updateProductStatus(adminId, productId, payload.status);
  }

  @Get("operations")
  getOperations() {
    return this.adminService.getOperations();
  }

  @Get("payments")
  getPayments(@Query() query: AdminDateRangeQueryDto) {
    return this.adminService.getPayments(query);
  }

  @Get("analytics")
  getAnalytics(@Query() query: AdminDateRangeQueryDto) {
    return this.adminService.getAnalytics(query);
  }

  @Get("ai")
  getAiMonitoring(@Query() query: AdminUserQueryDto) {
    return this.adminService.getAiMonitoring(query);
  }

  @Get("notifications")
  getNotifications() {
    return this.adminService.getNotifications();
  }

  @Get("settings")
  getSettings() {
    return this.adminService.getSettings();
  }
}
