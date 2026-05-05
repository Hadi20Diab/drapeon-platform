import { SetMetadata } from "@nestjs/common";

import type { AuthJwtPayload } from "../interfaces/auth-jwt-payload.interface";

export const ROLES_KEY = "roles";

export const Roles = (...roles: AuthJwtPayload["role"][]) => SetMetadata(ROLES_KEY, roles);
