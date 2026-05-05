import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DesignersModule } from "../designers/designers.module";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";

@Module({
  imports: [DesignersModule, AuthModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService]
})
export class ProductsModule {}
