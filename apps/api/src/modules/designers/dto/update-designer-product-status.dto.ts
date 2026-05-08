import { IsEnum } from "class-validator";
import { ProductStatus } from "@prisma/client";

export class UpdateDesignerProductStatusDto {
  @IsEnum(ProductStatus)
  status!: ProductStatus;
}