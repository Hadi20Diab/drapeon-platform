import { IsEnum } from "class-validator";
import { DesignerApprovalStatus } from "@prisma/client";

export class UpdateDesignerApprovalDto {
  @IsEnum(DesignerApprovalStatus)
  status!: DesignerApprovalStatus;
}
