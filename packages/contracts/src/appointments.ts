import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { errorSchema } from "./common/errors";
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
  /** D2: null si todavía no se creó una consulta desde esta cita (D1). */
  consultationId: z.string().nullable(),
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

/**
 * C2: `date` + `time` (hora de pared de la clínica, "08:00") en vez de un
 * `startsAt` ISO — así el frontend nunca convierte zonas horarias, igual
 * que en C1: arma el formulario con los mismos strings que ya recibió de
 * GET /appointments (la fecha del día que está viendo, la franja en la que
 * hizo clic) y el backend hace la conversión a UTC con RN-19.
 * `durationMinutes` se precarga con ClinicSettings.defaultAppointmentMin en
 * el frontend y es editable; el backend calcula `endsAt`.
 */
export const createAppointmentSchema = z.object({
  patientId: z.string().min(1, { message: "Debe seleccionar una mascota." }),
  vetId: z.string().min(1, { message: "Debe seleccionar un veterinario." }),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha debe tener el formato AAAA-MM-DD." }),
  time: z.string().regex(/^\d{2}:\d{2}$/, { message: "La hora debe tener el formato HH:MM." }),
  durationMinutes: z
    .number({ message: "La duración es obligatoria." })
    .int()
    .min(5, { message: "La duración mínima es 5 minutos." })
    .max(480, { message: "La duración máxima es 8 horas." }),
  type: appointmentTypeSchema.default("CONSULTA"),
  reason: z.string().min(1, { message: "El motivo es obligatorio." }).max(200),
  notes: z.string().max(2000).optional(),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

/**
 * C3: cambio de estado (RN-04). `cancelReason` es obligatorio únicamente
 * cuando `status` es `CANCELADA` — el resto de las validaciones del grafo
 * (transición válida según el estado actual, consulta cerrada) se hacen en
 * el backend, que es quien conoce el estado actual de la cita.
 */
export const changeAppointmentStatusSchema = z
  .object({
    status: appointmentStatusSchema,
    cancelReason: z.string().max(300).optional(),
  })
  .refine((data) => data.status !== "CANCELADA" || !!data.cancelReason?.trim(), {
    message: "Debe indicar el motivo de la cancelación.",
    path: ["cancelReason"],
  });
export type ChangeAppointmentStatusInput = z.infer<typeof changeAppointmentStatusSchema>;

/**
 * C3: mover (reprogramar) una cita. Igual que en `createAppointmentSchema`,
 * `date`+`time` son hora de pared de la clínica — el backend convierte a
 * UTC con RN-19 y vuelve a validar RN-01/02/03 contra el nuevo horario.
 */
export const moveAppointmentSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha debe tener el formato AAAA-MM-DD." }),
  time: z.string().regex(/^\d{2}:\d{2}$/, { message: "La hora debe tener el formato HH:MM." }),
});
export type MoveAppointmentInput = z.infer<typeof moveAppointmentSchema>;

/**
 * C4: vista semanal (lunes a domingo, RN-19 igual que C1 — "hoy"/la semana
 * de referencia se resuelven con ClinicSettings.timezone). Reutiliza
 * `agendaVetColumnSchema` para que cada día traiga las mismas citas
 * completas que ya usa la vista diaria: mismos chips, mismo click-through
 * al paciente, sin inventar un tipo "resumen" aparte.
 */
export const weekDaySchema = z.object({
  date: z.string(),
  isWorkingDay: z.boolean(),
  vets: z.array(agendaVetColumnSchema),
});
export type WeekDay = z.infer<typeof weekDaySchema>;

export const agendaWeekSchema = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  openingHour: z.number(),
  closingHour: z.number(),
  slotMinutes: z.number(),
  days: z.array(weekDaySchema),
});
export type AgendaWeek = z.infer<typeof agendaWeekSchema>;

export const getAgendaWeekQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha debe tener el formato AAAA-MM-DD." })
    .optional(),
});
export type GetAgendaWeekQuery = z.infer<typeof getAgendaWeekQuerySchema>;

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
  getWeek: {
    method: "GET",
    path: "/appointments/week",
    query: getAgendaWeekQuerySchema,
    responses: {
      200: agendaWeekSchema,
    },
  },
  create: {
    method: "POST",
    path: "/appointments",
    body: createAppointmentSchema,
    responses: {
      201: agendaAppointmentSchema,
      400: errorSchema,
      404: errorSchema,
      409: errorSchema,
    },
  },
  changeStatus: {
    method: "POST",
    path: "/appointments/:id/status",
    pathParams: z.object({ id: z.string() }),
    body: changeAppointmentStatusSchema,
    responses: {
      200: agendaAppointmentSchema,
      400: errorSchema,
      404: errorSchema,
      409: errorSchema,
      422: errorSchema,
    },
  },
  move: {
    method: "POST",
    path: "/appointments/:id/move",
    pathParams: z.object({ id: z.string() }),
    body: moveAppointmentSchema,
    responses: {
      200: agendaAppointmentSchema,
      400: errorSchema,
      404: errorSchema,
      409: errorSchema,
      422: errorSchema,
    },
  },
});
