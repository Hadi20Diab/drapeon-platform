import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateProductDto } from "./dto/create-product.dto";
import { ProductFiltersDto } from "./dto/product-filters.dto";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  listProducts(@Query() filters: ProductFiltersDto) {
    return this.productsService.listProducts(filters);
  }

  @Get(":id")
  getProduct(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.productsService.getProductById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DESIGNER)
  @Post()
  createProduct(@CurrentUser("sub") userId: string, @Body() payload: CreateProductDto) {
    return this.productsService.createProduct(userId, payload);
  }
}
