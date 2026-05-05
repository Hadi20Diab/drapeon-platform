import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateDeliveryRequestDto {
  @IsUUID()
  bookingId!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(300)
  deliveryAddress!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
