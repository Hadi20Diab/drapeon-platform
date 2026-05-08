import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { RentalOrderStatus } from "@prisma/client";

export class UpdateRentalOrderStatusDto {
  @IsEnum(RentalOrderStatus)
  status!: RentalOrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}