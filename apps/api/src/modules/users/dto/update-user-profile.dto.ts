import { IsObject, IsOptional, IsPhoneNumber, IsString, IsUrl, MinLength } from "class-validator";

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;
}
