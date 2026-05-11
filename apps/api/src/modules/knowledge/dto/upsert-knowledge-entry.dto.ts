import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpsertKnowledgeEntryDto {
  @IsString()
  @MinLength(8)
  @MaxLength(240)
  question!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(8000)
  answer!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
