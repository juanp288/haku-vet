import { SetMetadata } from "@nestjs/common";
import type { Role } from "@vetclinic/db";

export const ROLES_KEY = "roles";

/** Restringe una ruta a los roles indicados, según la matriz de RN-18. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
