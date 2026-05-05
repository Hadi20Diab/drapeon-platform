import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { IsUUID } from "class-validator";

import { CreateProductDto } from "./dto/create-product.dto";
import { ProductFiltersDto } from "./dto/product-filters.dto";
import { ProductsService } from "./products.service";

class DesignerQueryDto {
  @IsUUID()
  designerId!: string;
}

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

  @Post()
  createProduct(@Query() query: DesignerQueryDto, @Body() payload: CreateProductDto) {
    return this.productsService.createProduct(query.designerId, payload);
  }
}
