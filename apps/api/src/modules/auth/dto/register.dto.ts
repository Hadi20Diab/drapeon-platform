import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export enum RegistrationRole {
  USER = "USER",
  DESIGNER = "DESIGNER"
}

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  firstName!: string;

  @IsString()
  @MinLength(2)
  lastName!: string;

  @IsOptional()
  @IsEnum(RegistrationRole)
  role?: RegistrationRole;
}
