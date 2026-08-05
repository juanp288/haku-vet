import type { Species } from "@vetclinic/contracts";

export const SPECIES_LABELS: Record<Species, string> = {
  CANINO: "Canino",
  FELINO: "Felino",
  AVE: "Ave",
  ROEDOR: "Roedor",
  REPTIL: "Reptil",
  OTRO: "Otro",
};

export const SPECIES_OPTIONS: Species[] = ["CANINO", "FELINO", "AVE", "ROEDOR", "REPTIL", "OTRO"];
