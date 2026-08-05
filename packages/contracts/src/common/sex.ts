import { z } from "zod";

/** Debe permanecer sincronizado con el enum Sex de schema.prisma. */
export const sexSchema = z.enum(["MACHO", "HEMBRA", "DESCONOCIDO"]);

export type Sex = z.infer<typeof sexSchema>;
