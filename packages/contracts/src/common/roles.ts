import { z } from "zod";

/** Debe permanecer sincronizado con el enum Role de packages/db/prisma/schema.prisma. */
export const roleSchema = z.enum(["ADMIN", "VETERINARIO", "RECEPCION", "AUXILIAR"]);

export type Role = z.infer<typeof roleSchema>;
