import { IsDateString, IsOptional } from "class-validator";

export class AdminDateRangeQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
