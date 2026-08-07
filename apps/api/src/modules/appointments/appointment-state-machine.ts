import type { AppointmentStatus } from "@vetclinic/contracts";

/**
 * RN-04 — el grafo del diagrama de doc 04 es la fuente de verdad (confirmado
 * con el humano: el texto resumido de C3 no coincide exactamente, ej. omite
 * a dónde transiciona CONFIRMADA y agrega un salto directo AGENDADA→EN_SALA
 * que el diagrama no contempla).
 */
const VALID_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  AGENDADA: ["CONFIRMADA", "NO_ASISTIO", "CANCELADA"],
  CONFIRMADA: ["EN_SALA", "NO_ASISTIO"],
  EN_SALA: ["EN_ATENCION", "NO_ASISTIO"],
  EN_ATENCION: ["ATENDIDA"],
  ATENDIDA: [],
  NO_ASISTIO: [],
  CANCELADA: [],
};

export function isValidAppointmentTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function getValidNextStatuses(from: AppointmentStatus): readonly AppointmentStatus[] {
  return VALID_TRANSITIONS[from];
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  AGENDADA: "agendada",
  CONFIRMADA: "confirmada",
  EN_SALA: "en sala",
  EN_ATENCION: "en atención",
  ATENDIDA: "atendida",
  NO_ASISTIO: "no asistió",
  CANCELADA: "cancelada",
};

export function describeInvalidTransition(from: AppointmentStatus, to: AppointmentStatus): string {
  const validNext = getValidNextStatuses(from);
  if (validNext.length === 0) {
    return `La cita está ${STATUS_LABELS[from]} y ese es un estado final: no admite pasar a ${STATUS_LABELS[to]} ni a ningún otro estado.`;
  }
  const options = validNext.map((status) => STATUS_LABELS[status]).join(", ");
  return `Una cita ${STATUS_LABELS[from]} no puede pasar a ${STATUS_LABELS[to]}; solo puede pasar a: ${options}.`;
}
