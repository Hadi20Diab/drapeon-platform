export interface AuthJwtPayload {
  sub: string;
  email: string;
  role: "USER" | "DESIGNER" | "ADMIN";
}
