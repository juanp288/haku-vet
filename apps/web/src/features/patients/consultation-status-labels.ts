import type { ConsultationStatus } from "@vetclinic/contracts";

export const CONSULTATION_STATUS_LABELS: Record<ConsultationStatus, string> = {
  BORRADOR: "Borrador",
  CERRADA: "Cerrada",
};

export const CONSULTATION_STATUS_CLASSES: Record<ConsultationStatus, string> = {
  BORRADOR: "bg-warning-100 text-warning-700",
  CERRADA: "bg-brand-2-100 text-brand-2-700",
};
