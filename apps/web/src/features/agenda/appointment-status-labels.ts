import type { AppointmentStatus } from "@vetclinic/contracts";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  AGENDADA: "Agendada",
  CONFIRMADA: "Confirmada",
  EN_SALA: "En sala",
  EN_ATENCION: "En atención",
  ATENDIDA: "Atendida",
  NO_ASISTIO: "No asistió",
  CANCELADA: "Cancelada",
};

export const APPOINTMENT_STATUS_CLASSES: Record<AppointmentStatus, string> = {
  AGENDADA: "bg-muted text-neutral-700",
  CONFIRMADA: "bg-brand-100 text-brand-700",
  EN_SALA: "bg-warning-100 text-warning-700",
  EN_ATENCION: "bg-warning-100 text-warning-700",
  ATENDIDA: "bg-brand-2-100 text-brand-2-700",
  NO_ASISTIO: "bg-neutral-200 text-neutral-700",
  CANCELADA: "bg-danger-100 text-danger-700",
};
