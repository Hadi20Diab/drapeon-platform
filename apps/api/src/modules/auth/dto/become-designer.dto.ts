import { IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from "class-validator";

export class BecomeDesignerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  storeName!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(4000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  location?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  brandColor?: string;

  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @IsOptional()
  @IsUrl()
  instagramUrl?: string;
}
