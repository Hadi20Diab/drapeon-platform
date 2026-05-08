import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateStoreDto } from "./dto/create-store.dto";
import { DesignerProductDto } from "./dto/designer-product.dto";
import { DesignerProductQueryDto } from "./dto/designer-product-query.dto";
import { SendDesignerMessageDto } from "./dto/send-designer-message.dto";
import { UpdateDesignerAppointmentStatusDto } from "./dto/update-designer-appointment-status.dto";
import { UpdateDesignerProductStatusDto } from "./dto/update-designer-product-status.dto";
import { UpdateDesignerSettingsDto } from "./dto/update-designer-settings.dto";
import { UpdateRentalOrderStatusDto } from "./dto/update-rental-order-status.dto";
import { DesignersService } from "./designers.service";

@Controller("designers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DESIGNER)
export class DesignersController {
  constructor(private readonly designersService: DesignersService) {}

  @Post("store")
  createStore(@CurrentUser("sub") userId: string, @Body() payload: CreateStoreDto) {
    return this.designersService.createOrUpdateStore(userId, payload);
  }

  @Get("dashboard")
  getDashboard(@CurrentUser("sub") userId: string) {
    return this.designersService.getDashboard(userId);
  }

  @Get("products")
  listProducts(@CurrentUser("sub") userId: string, @Query() query: DesignerProductQueryDto) {
    return this.designersService.listDesignerProducts(userId, query);
  }

  @Post("products")
  createProduct(@CurrentUser("sub") userId: string, @Body() payload: DesignerProductDto) {
    return this.designersService.createDesignerProduct(userId, payload);
  }

  @Put("products/:id")
  updateProduct(
    @CurrentUser("sub") userId: string,
    @Param("id", new ParseUUIDPipe()) productId: string,
    @Body() payload: DesignerProductDto
  ) {
    return this.designersService.updateDesignerProduct(userId, productId, payload);
  }

  @Patch("products/:id/status")
  updateProductStatus(
    @CurrentUser("sub") userId: string,
    @Param("id", new ParseUUIDPipe()) productId: string,
    @Body() payload: UpdateDesignerProductStatusDto
  ) {
    return this.designersService.updateDesignerProductStatus(userId, productId, payload);
  }

  @Delete("products/:id")
  deleteProduct(
    @CurrentUser("sub") userId: string,
    @Param("id", new ParseUUIDPipe()) productId: string
  ) {
    return this.designersService.deleteDesignerProduct(userId, productId);
  }

  @Get("orders")
  listOrders(@CurrentUser("sub") userId: string) {
    return this.designersService.listRentalOrders(userId);
  }

  @Patch("orders/:id/status")
  updateOrderStatus(
    @CurrentUser("sub") userId: string,
    @Param("id", new ParseUUIDPipe()) orderId: string,
    @Body() payload: UpdateRentalOrderStatusDto
  ) {
    return this.designersService.updateRentalOrderStatus(userId, orderId, payload);
  }

  @Get("appointments")
  listAppointments(@CurrentUser("sub") userId: string) {
    return this.designersService.listAppointments(userId);
  }

  @Patch("appointments/:id/status")
  updateAppointmentStatus(
    @CurrentUser("sub") userId: string,
    @Param("id", new ParseUUIDPipe()) bookingId: string,
    @Body() payload: UpdateDesignerAppointmentStatusDto
  ) {
    return this.designersService.updateAppointmentStatus(
      userId,
      bookingId,
      payload.status,
      payload.notes
    );
  }

  @Get("conversations")
  listConversations(@CurrentUser("sub") userId: string) {
    return this.designersService.listConversations(userId);
  }

  @Get("conversations/:id")
  getConversation(
    @CurrentUser("sub") userId: string,
    @Param("id", new ParseUUIDPipe()) conversationId: string
  ) {
    return this.designersService.getConversation(userId, conversationId);
  }

  @Post("conversations/:id/messages")
  sendMessage(
    @CurrentUser("sub") userId: string,
    @Param("id", new ParseUUIDPipe()) conversationId: string,
    @Body() payload: SendDesignerMessageDto
  ) {
    return this.designersService.sendMessage(userId, conversationId, payload);
  }

  @Get("notifications")
  listNotifications(@CurrentUser("sub") userId: string) {
    return this.designersService.listNotifications(userId);
  }

  @Patch("notifications/:id/read")
  markNotificationRead(
    @CurrentUser("sub") userId: string,
    @Param("id", new ParseUUIDPipe()) notificationId: string
  ) {
    return this.designersService.markNotificationRead(userId, notificationId);
  }

  @Patch("settings")
  updateSettings(@CurrentUser("sub") userId: string, @Body() payload: UpdateDesignerSettingsDto) {
    return this.designersService.updateSettings(userId, payload);
  }

  @Post("stripe/onboarding-link")
  createStripeOnboardingLink(@CurrentUser("sub") userId: string) {
    return this.designersService.createStripeOnboardingLink(userId);
  }

  @Post("stripe/refresh-status")
  refreshStripeStatus(@CurrentUser("sub") userId: string) {
    return this.designersService.refreshStripeStatus(userId);
  }
}
