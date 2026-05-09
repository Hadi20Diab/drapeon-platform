import { IsString, MinLength } from "class-validator";

export class VerifyEmailDto {
  @IsString()
  @MinLength(24)
  token!: string;
}
