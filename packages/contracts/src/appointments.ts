import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { speciesSchema } from "./common/species";

/** Debe permanecer sincronizado con el enum AppointmentStatus de schema.prisma (RN-04). */
export const appointmentStatusSchema = z.enum([
  "AGENDADA",
  "CONFIRMADA",
  "EN_SALA",
  "EN_ATENCION",
  "ATENDIDA",
  "NO_ASISTIO",
  "CANCELADA",
]);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

/** Debe permanecer sincronizado con el enum AppointmentType de schema.prisma. */
export const appointmentTypeSchema = z.enum([
  "CONSULTA",
  "VACUNACION",
  "CONTROL",
  "PROCEDIMIENTO",
  "URGENCIA",
  "OTRO",
]);
export type AppointmentType = z.infer<typeof appointmentTypeSchema>;

export const agendaAppointmentSchema = z.object({
  id: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  /** Hora de pared de la clínica ("08:00"), ya resuelta en el backend (RN-19) — el frontend no convierte zonas horarias. */
  startTimeLabel: z.string(),
  type: appointmentTypeSchema,
  status: appointmentStatusSchema,
  reason: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  patientSpecies: speciesSchema,
  tutorName: z.string(),
});
export type AgendaAppointment = z.infer<typeof agendaAppointmentSchema>;

export const agendaVetColumnSchema = z.object({
  vetId: z.string(),
  vetName: z.string(),
  color: z.string().nullable(),
  appointments: z.array(agendaAppointmentSchema),
});
export type AgendaVetColumn = z.infer<typeof agendaVetColumnSchema>;

/**
 * C1: vista del día completo. `date` siempre viene resuelta por el backend
 * (RN-19 — "hoy" se calcula con ClinicSettings.timezone, nunca con el
 * reloj del navegador), incluso cuando el query no la trae.
 */
export const agendaDaySchema = z.object({
  date: z.string(),
  isWorkingDay: z.boolean(),
  openingHour: z.number(),
  closingHour: z.number(),
  slotMinutes: z.number(),
  vets: z.array(agendaVetColumnSchema),
});
export type AgendaDay = z.infer<typeof agendaDaySchema>;

export const getAgendaQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha debe tener el formato AAAA-MM-DD." })
    .optional(),
});
export type GetAgendaQuery = z.infer<typeof getAgendaQuerySchema>;

const c = initContract();

export const appointmentsContract = c.router({
  getAgenda: {
    method: "GET",
    path: "/appointments",
    query: getAgendaQuerySchema,
    responses: {
      200: agendaDaySchema,
    },
  },
});
