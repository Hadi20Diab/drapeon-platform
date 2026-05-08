import { Type } from "class-transformer";
import { IsArray, IsEmail, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator";

class StripeCheckoutItemDto {
  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

class StripeCheckoutCustomerDto {
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreateStripeCheckoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StripeCheckoutItemDto)
  items!: StripeCheckoutItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => StripeCheckoutCustomerDto)
  customer?: StripeCheckoutCustomerDto;
}
