import type { DocumentType } from "@vetclinic/contracts";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  CC: "CC",
  CE: "CE",
  NIT: "NIT",
  PASAPORTE: "Pasaporte",
  OTRO: "Otro",
};

export const DOCUMENT_TYPE_OPTIONS: DocumentType[] = ["CC", "CE", "NIT", "PASAPORTE", "OTRO"];
