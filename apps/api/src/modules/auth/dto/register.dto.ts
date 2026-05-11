import { Type } from "class-transformer";
import {
  IsEnum,
  IsEmail,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
  ValidateNested
} from "class-validator";
import { BodyShape } from "@prisma/client";

export enum RegistrationRole {
  USER = "USER",
  DESIGNER = "DESIGNER"
}

export class RegisterBodyMeasurementsDto {
  @IsEnum(BodyShape)
  bodyShape!: BodyShape;

  @IsNumber()
  @IsPositive()
  heightCm!: number;

  @IsNumber()
  @IsPositive()
  weightKg!: number;

  @IsNumber()
  @IsPositive()
  chestCm!: number;

  @IsNumber()
  @IsPositive()
  waistCm!: number;

  @IsNumber()
  @IsPositive()
  hipCm!: number;

  @IsNumber()
  @IsPositive()
  shoulderCm!: number;

  @IsNumber()
  @IsPositive()
  inseamCm!: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  notes?: string;
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

  @ValidateNested()
  @Type(() => RegisterBodyMeasurementsDto)
  measurements!: RegisterBodyMeasurementsDto;
}
