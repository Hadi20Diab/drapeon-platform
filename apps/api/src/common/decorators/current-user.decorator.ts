import { createParamDecorator } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import type { AuthJwtPayload } from "../../modules/auth/interfaces/auth-jwt-payload.interface";

type AuthenticatedRequest = Request & {
  user?: AuthJwtPayload;
};

export const CurrentUser = createParamDecorator(
  (field: keyof AuthJwtPayload | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (field == null) {
      return user;
    }

    return user?.[field];
  }
);
