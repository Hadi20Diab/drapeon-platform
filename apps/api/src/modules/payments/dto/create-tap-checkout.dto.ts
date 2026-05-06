import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from "class-validator";

class CheckoutItemDto {
  @IsString()
  productId!: string;

  @IsString()
  title!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  unitPrice!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  designerDestinationId?: string;
}

class CheckoutCustomerDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

export class CreateTapCheckoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @ValidateNested()
  @Type(() => CheckoutCustomerDto)
  customer!: CheckoutCustomerDto;
}
