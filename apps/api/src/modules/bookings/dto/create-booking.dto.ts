import { Type } from "class-transformer";
import { IsDate, IsEnum, IsOptional, IsUUID } from "class-validator";

export enum BookingType {
  FITTING = "FITTING",
  RENTAL = "RENTAL"
}

export class CreateBookingDto {
  @IsUUID()
  productId!: string;

  @IsUUID()
  designerId!: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @Type(() => Date)
  @IsDate()
  endsAt!: Date;

  @IsOptional()
  @IsEnum(BookingType)
  type?: BookingType;
}
