import { z } from "zod";

/**
 * Forma estándar de cualquier error devuelto por la API. El mensaje siempre
 * está en español y sin jerga técnica (CLAUDE.md, regla 10).
 */
export const errorSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ApiError = z.infer<typeof errorSchema>;
