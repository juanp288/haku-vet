import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { errorSchema } from "./common/errors";
import { roleSchema } from "./common/roles";

/** Nombre de la cookie httpOnly que guarda el JWT (doc 05 §4). Compartido
 * entre apps/api (la setea) y apps/web (el middleware solo comprueba que
 * exista, nunca la lee ni la valida). */
export const ACCESS_TOKEN_COOKIE = "access_token";

export const loginSchema = z.object({
  email: z.string().email({ message: "Correo inválido" }),
  password: z.string().min(1, { message: "La contraseña es obligatoria" }),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  role: roleSchema,
});
export type AuthUser = z.infer<typeof authUserSchema>;

const c = initContract();

export const authContract = c.router({
  login: {
    method: "POST",
    path: "/auth/login",
    body: loginSchema,
    responses: {
      200: authUserSchema,
      401: errorSchema,
      429: errorSchema,
    },
  },
  logout: {
    method: "POST",
    path: "/auth/logout",
    body: z.object({}),
    responses: {
      200: z.object({ ok: z.literal(true) }),
    },
  },
  me: {
    method: "GET",
    path: "/auth/me",
    responses: {
      200: authUserSchema,
      401: errorSchema,
    },
  },
  refresh: {
    method: "POST",
    path: "/auth/refresh",
    body: z.object({}),
    responses: {
      200: authUserSchema,
      401: errorSchema,
    },
  },
});
