import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { speciesSchema } from "./common/species";

/**
 * B2: un resultado por paciente que coincide (por nombre de la mascota o
 * por datos del acudiente — teléfono, documento, nombre). El acudiente
 * mostrado es siempre el principal, sin importar por cuál acudiente haya
 * coincidido la búsqueda.
 */
export const searchResultSchema = z.object({
  patientId: z.string(),
  patientName: z.string(),
  species: speciesSchema,
  primaryTutorName: z.string(),
  primaryTutorPhone: z.string(),
});
export type SearchResult = z.infer<typeof searchResultSchema>;

export const searchQuerySchema = z.object({
  q: z.string().min(1, { message: "Escriba algo para buscar." }),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

const c = initContract();

export const searchContract = c.router({
  search: {
    method: "GET",
    path: "/search",
    query: searchQuerySchema,
    responses: {
      200: z.array(searchResultSchema),
    },
  },
});
