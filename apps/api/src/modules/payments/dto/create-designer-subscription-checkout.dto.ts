import { IsUUID } from "class-validator";

export class CreateDesignerSubscriptionCheckoutDto {
  @IsUUID()
  planId!: string;
}
