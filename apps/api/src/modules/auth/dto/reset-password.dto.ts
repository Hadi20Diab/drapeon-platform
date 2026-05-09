import { IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @IsString()
  @MinLength(24)
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
