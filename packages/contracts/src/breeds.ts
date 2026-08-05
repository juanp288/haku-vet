import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { speciesSchema } from "./common/species";

export const breedSchema = z.object({
  id: z.string(),
  name: z.string(),
  species: speciesSchema,
});
export type Breed = z.infer<typeof breedSchema>;

export const listBreedsQuerySchema = z.object({
  species: speciesSchema,
});
export type ListBreedsQuery = z.infer<typeof listBreedsQuerySchema>;

const c = initContract();

export const breedsContract = c.router({
  list: {
    method: "GET",
    path: "/breeds",
    query: listBreedsQuerySchema,
    responses: {
      200: z.array(breedSchema),
    },
  },
});
