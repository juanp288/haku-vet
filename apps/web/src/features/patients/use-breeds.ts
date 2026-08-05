"use client";

import type { Species } from "@vetclinic/contracts";
import { tsr } from "@/lib/api-client";

export function useBreeds(species: Species | "") {
  return tsr.breeds.list.useQuery({
    queryKey: ["breeds", species],
    queryData: { query: { species: species as Species } },
    enabled: species !== "",
  });
}
