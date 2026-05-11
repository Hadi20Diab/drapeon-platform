import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength
} from "class-validator";
import { BodyShape, ProductCategory, ProductStatus } from "@prisma/client";

export class DesignerProductDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  description!: string;

  @IsEnum(ProductCategory)
  category!: ProductCategory;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  rentalPrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  buyPrice?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(24)
  @IsString({ each: true })
  sizes!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(24)
  @IsString({ each: true })
  colors!: string[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  stockQuantity!: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(90)
  @IsString({ each: true })
  availabilityDates?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsString({ each: true })
  images!: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(16)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsEnum(BodyShape, { each: true })
  bodyShapes?: BodyShape[];

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
