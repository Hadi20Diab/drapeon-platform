import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MinLength,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";
import { ProductCategory } from "@prisma/client";


class ProductImageDto {
  @IsUrl()
  url!: string;

  @IsOptional()
  @IsString()
  altText?: string;
}

class ProductVariantDto {
  @IsString()
  size!: string;

  @IsString()
  color!: string;

  @IsInt()
  @IsPositive()
  stockTotal!: number;

  @IsOptional()
  @IsString()
  sku?: string;
}

export class CreateProductDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(20)
  description!: string;

  @IsEnum(ProductCategory)
  category!: ProductCategory;

  @IsNumber()
  @IsPositive()
  rentalPrice!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images!: ProductImageDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants!: ProductVariantDto[];
}
