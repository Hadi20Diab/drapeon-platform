import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { ProductStatus } from "@prisma/client";

export enum DesignerProductSort {
  NEWEST = "newest",
  MOST_RENTED = "most_rented",
  PRICE = "price"
}

export class DesignerProductQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsEnum(DesignerProductSort)
  sort?: DesignerProductSort;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}