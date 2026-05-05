import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateStoreDto {
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
}
