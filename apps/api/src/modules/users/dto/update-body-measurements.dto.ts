import { BodyShape } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, MinLength } from "class-validator";

export class UpdateBodyMeasurementsDto {
  @IsOptional()
  @IsEnum(BodyShape)
  bodyShape?: BodyShape;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  chestCm?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  waistCm?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  hipCm?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  shoulderCm?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  inseamCm?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  notes?: string;
}
