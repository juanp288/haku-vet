import type { AppointmentStatus } from "@vetclinic/contracts";

/** RN-04 — debe permanecer sincronizado con appointment-state-machine.ts del backend (es quien valida de verdad). */
export const APPOINTMENT_VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  AGENDADA: ["CONFIRMADA", "NO_ASISTIO", "CANCELADA"],
  CONFIRMADA: ["EN_SALA", "NO_ASISTIO"],
  EN_SALA: ["EN_ATENCION", "NO_ASISTIO"],
  EN_ATENCION: ["ATENDIDA"],
  ATENDIDA: [],
  NO_ASISTIO: [],
  CANCELADA: [],
};

/** Solo tiene sentido reprogramar una cita que todavía no sucedió. */
export const MOVABLE_APPOINTMENT_STATUSES: AppointmentStatus[] = ["AGENDADA", "CONFIRMADA"];
