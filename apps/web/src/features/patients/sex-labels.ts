import type { Sex } from "@vetclinic/contracts";

export const SEX_LABELS: Record<Sex, string> = {
  MACHO: "Macho",
  HEMBRA: "Hembra",
  DESCONOCIDO: "Desconocido",
};

export const SEX_OPTIONS: Sex[] = ["DESCONOCIDO", "MACHO", "HEMBRA"];
