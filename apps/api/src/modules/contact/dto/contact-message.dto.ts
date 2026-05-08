import { IsEmail, IsIn, IsString, MaxLength, MinLength } from "class-validator";

export class ContactMessageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(180)
  email!: string;

  @IsString()
  @IsIn(["Designer onboarding", "Rental support", "Partnership", "Payment setup"])
  topic!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  message!: string;
}
