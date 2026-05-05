import { IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class AiFiltersDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

class AiMeasurementContextDto {
  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  chestCm?: number;

  @IsOptional()
  @IsNumber()
  waistCm?: number;

  @IsOptional()
  @IsNumber()
  hipCm?: number;
}

export class AiRecommendationDto {
  @IsString()
  @MaxLength(800)
  prompt!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AiFiltersDto)
  filters?: AiFiltersDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AiMeasurementContextDto)
  measurements?: AiMeasurementContextDto;
}
