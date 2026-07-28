import { ACCESS_TOKEN_COOKIE } from "@vetclinic/contracts";
import type { Role } from "@vetclinic/db";

export { ACCESS_TOKEN_COOKIE };
export const ACCESS_TOKEN_TTL = "12h";
export const ACCESS_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
