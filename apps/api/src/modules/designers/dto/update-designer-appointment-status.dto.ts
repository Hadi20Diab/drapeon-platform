import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { BookingStatus } from "@prisma/client";

export class UpdateDesignerAppointmentStatusDto {
  @IsEnum(BookingStatus)
  status!: BookingStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}