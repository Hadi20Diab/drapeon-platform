import { IsNumber, IsOptional, IsPositive } from "class-validator";

export class UpdateBodyMeasurementsDto {
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
}
