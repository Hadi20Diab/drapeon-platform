import { BodyShape } from "@prisma/client";
import {
  ArrayMaxSize,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested
} from "class-validator";
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

  @IsOptional()
  @IsEnum(BodyShape)
  bodyShape?: BodyShape;
}

class AiMeasurementContextDto {
  @IsOptional()
  @IsEnum(BodyShape)
  bodyShape?: BodyShape;

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

class AiConversationMessageDto {
  @IsIn(["user", "agent"])
  role!: "user" | "agent";

  @IsString()
  @MaxLength(1200)
  text!: string;
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

  @IsOptional()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => AiConversationMessageDto)
  history?: AiConversationMessageDto[];
}
