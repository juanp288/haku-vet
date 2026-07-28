import { z } from "zod";

/** Debe permanecer sincronizado con el enum Species de schema.prisma. */
export const speciesSchema = z.enum(["CANINO", "FELINO", "AVE", "ROEDOR", "REPTIL", "OTRO"]);

export type Species = z.infer<typeof speciesSchema>;
