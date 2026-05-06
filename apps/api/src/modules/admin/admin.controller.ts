import { Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard")
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Patch("designers/:id/approve")
  approveDesigner(
    @CurrentUser("sub") adminId: string,
    @Param("id", new ParseUUIDPipe()) designerId: string
  ) {
    return this.adminService.approveDesigner(adminId, designerId);
  }
}
