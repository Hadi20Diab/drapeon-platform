import { Injectable, NotFoundException } from "@nestjs/common";

import { CreateProductDto } from "./dto/create-product.dto";
import { ProductFiltersDto } from "./dto/product-filters.dto";

@Injectable()
export class ProductsService {
  createProduct(designerId: string, payload: CreateProductDto) {
    return {
      designerId,
      ...payload
    };
  }

  listProducts(filters: ProductFiltersDto) {
    return {
      items: [],
      pagination: {
        page: filters.page ?? 0,
        limit: filters.limit ?? 12,
        total: 0
      }
    };
  }

  getProductById(productId: string) {
    throw new NotFoundException(`Product ${productId} was not found`);
  }
}
