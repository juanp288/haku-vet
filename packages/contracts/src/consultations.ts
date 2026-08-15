import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { errorSchema } from "./common/errors";

/** Debe permanecer sincronizado con el enum ConsultationStatus de schema.prisma. */
export const consultationStatusSchema = z.enum(["BORRADOR", "CERRADA"]);
export type ConsultationStatus = z.infer<typeof consultationStatusSchema>;

/**
 * Resumen de una consulta para la pestaña "Historia clínica" de B5 (fila de
 * lista, no el detalle SOAP completo — eso es D5). `reason`/`diagnosis`
 * llegan `null` cuando el backend los redacta para AUXILIAR (RN-18: ese rol
 * solo ve signos vitales).
 */
export const consultationSummarySchema = z.object({
  id: z.string(),
  occurredAt: z.string(),
  status: consultationStatusSchema,
  vetName: z.string(),
  reason: z.string().nullable(),
  diagnosis: z.string().nullable(),
  weightKg: z.number().nullable(),
  temperatureC: z.number().nullable(),
  heartRate: z.number().nullable(),
  respiratoryRate: z.number().nullable(),
});
export type ConsultationSummary = z.infer<typeof consultationSummarySchema>;

const PAGE_SIZE = 10;
export { PAGE_SIZE as CONSULTATIONS_PAGE_SIZE };

export const listConsultationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});
export type ListConsultationsQuery = z.infer<typeof listConsultationsQuerySchema>;

export const consultationsPageSchema = z.object({
  items: z.array(consultationSummarySchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});
export type ConsultationsPage = z.infer<typeof consultationsPageSchema>;

/**
 * D1: crear una consulta. Exactamente una de `appointmentId` (desde una
 * cita EN_SALA/EN_ATENCION, precarga paciente+veterinario) o `patientId`
 * (urgencia sin cita, requiere elegir veterinario explícitamente — el
 * backend es quien valida el estado de la cita, RN visible en doc 03).
 */
export const createConsultationSchema = z
  .object({
    appointmentId: z.string().optional(),
    patientId: z.string().optional(),
    vetId: z.string().optional(),
    reason: z.string().min(1, { message: "El motivo de la consulta es obligatorio." }).max(500),
  })
  .refine((data) => Boolean(data.appointmentId) !== Boolean(data.patientId), {
    message: "Debe indicar una cita o una mascota, no ambas.",
    path: ["patientId"],
  })
  .refine((data) => Boolean(data.appointmentId) || Boolean(data.vetId), {
    message: "Debe seleccionar un veterinario.",
    path: ["vetId"],
  });
export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;

/**
 * D2: "un valor fuera de rango fisiológico advierte pero no bloquea (puede
 * ser real)" — por eso estos números NO son límites `.min()/.max()` en el
 * schema (eso sí bloquearía). Son la referencia que usa el frontend para
 * mostrar la advertencia; `bodyConditionScore` es la única excepción real
 * porque 1–9 es una escala cerrada, no una medición fisiológica que pueda
 * legítimamente salirse del rango.
 */
export const VITAL_SIGN_RANGES = {
  weightKg: { min: 0.05, max: 120, unit: "kg" },
  temperatureC: { min: 30, max: 45, unit: "°C" },
  heartRate: { min: 20, max: 300, unit: "lpm" },
  respiratoryRate: { min: 5, max: 150, unit: "rpm" },
  bodyConditionScore: { min: 1, max: 9, unit: "" },
} as const;

const vitalSignsShape = {
  weightKg: z.number().positive().nullable().optional(),
  temperatureC: z.number().positive().nullable().optional(),
  heartRate: z.number().int().positive().nullable().optional(),
  respiratoryRate: z.number().int().positive().nullable().optional(),
  bodyConditionScore: z
    .number()
    .int()
    .min(VITAL_SIGN_RANGES.bodyConditionScore.min)
    .max(VITAL_SIGN_RANGES.bodyConditionScore.max)
    .nullable()
    .optional(),
  mucousMembranes: z.string().max(200).nullable().optional(),
  capillaryRefill: z.number().positive().nullable().optional(),
};

/**
 * D1: autoguardado del borrador (cada 30s y al cambiar de campo, según el
 * frontend). Todos los campos son opcionales — el frontend solo envía lo
 * que cambió. El backend rechaza esto si la consulta ya está CERRADA
 * (RN-05). Incluye los campos de signos vitales porque VETERINARIO también
 * puede editarlos (RN-18) — para AUXILIAR, ver `updateVitalsSchema`.
 */
export const updateConsultationDraftSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
  subjective: z.string().max(5000).nullable().optional(),
  objective: z.string().max(5000).nullable().optional(),
  assessment: z.string().max(5000).nullable().optional(),
  plan: z.string().max(5000).nullable().optional(),
  diagnosis: z.string().max(2000).nullable().optional(),
  treatment: z.string().max(2000).nullable().optional(),
  prescription: z.string().max(2000).nullable().optional(),
  ...vitalSignsShape,
  nextControlAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha debe tener el formato AAAA-MM-DD." })
    .nullable()
    .optional(),
});
export type UpdateConsultationDraftInput = z.infer<typeof updateConsultationDraftSchema>;

/**
 * D2: "el rol AUXILIAR puede editar únicamente los campos de signos
 * vitales de una consulta en borrador" — mismos validadores que la parte
 * de signos vitales de `updateConsultationDraftSchema`, pero sin
 * reason/SOAP/diagnóstico/etc., así que ni siquiera es posible enviarlos
 * por este endpoint (no hace falta lógica extra para rechazarlos).
 */
export const updateVitalsSchema = z.object(vitalSignsShape);
export type UpdateVitalsInput = z.infer<typeof updateVitalsSchema>;

/**
 * D1: detalle completo para el editor SOAP. `reason`/SOAP/diagnóstico
 * quedan `null` cuando el backend redacta para AUXILIAR (RN-18: "solo
 * signos vitales"), igual patrón que `consultationSummarySchema`.
 */
export const consultationDetailSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  appointmentId: z.string().nullable(),
  vetId: z.string(),
  vetName: z.string(),
  occurredAt: z.string(),
  status: consultationStatusSchema,
  closedAt: z.string().nullable(),
  reason: z.string().nullable(),
  subjective: z.string().nullable(),
  objective: z.string().nullable(),
  assessment: z.string().nullable(),
  plan: z.string().nullable(),
  diagnosis: z.string().nullable(),
  treatment: z.string().nullable(),
  prescription: z.string().nullable(),
  weightKg: z.number().nullable(),
  /** D2: "el peso se muestra junto al último registrado y su variación porcentual" — último peso de una consulta CERRADA anterior de este paciente. */
  previousWeightKg: z.number().nullable(),
  temperatureC: z.number().nullable(),
  heartRate: z.number().nullable(),
  respiratoryRate: z.number().nullable(),
  bodyConditionScore: z.number().nullable(),
  mucousMembranes: z.string().nullable(),
  capillaryRefill: z.number().nullable(),
  nextControlAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ConsultationDetail = z.infer<typeof consultationDetailSchema>;

const c = initContract();

export const consultationsContract = c.router({
  /** RN-18 "Crear y cerrar consultas": ADMIN, VETERINARIO (no RECEPCION, no AUXILIAR). */
  create: {
    method: "POST",
    path: "/consultations",
    body: createConsultationSchema,
    responses: {
      201: consultationDetailSchema,
      400: errorSchema,
      404: errorSchema,
      409: errorSchema,
      422: errorSchema,
    },
  },
  /** RN-18 "Ver historia clínica": ADMIN, VETERINARIO, AUXILIAR (redactado). RN-07: BORRADOR solo su autor o ADMIN. */
  getById: {
    method: "GET",
    path: "/consultations/:id",
    pathParams: z.object({ id: z.string() }),
    responses: {
      200: consultationDetailSchema,
      404: errorSchema,
    },
  },
  updateDraft: {
    method: "PATCH",
    path: "/consultations/:id",
    pathParams: z.object({ id: z.string() }),
    body: updateConsultationDraftSchema,
    responses: {
      200: consultationDetailSchema,
      404: errorSchema,
      409: errorSchema,
      422: errorSchema,
    },
  },
  /**
   * RN-18 "Editar signos vitales (borrador)": ADMIN, VETERINARIO, AUXILIAR.
   * A diferencia de `updateDraft`, no exige que quien llama sea el autor de
   * la consulta ni ADMIN (RN-07 es sobre visibilidad del contenido clínico,
   * no sobre quién puede registrar una medición) — solo que exista y siga
   * en BORRADOR.
   */
  updateVitals: {
    method: "PATCH",
    path: "/consultations/:id/vitals",
    pathParams: z.object({ id: z.string() }),
    body: updateVitalsSchema,
    responses: {
      200: consultationDetailSchema,
      404: errorSchema,
      409: errorSchema,
      422: errorSchema,
    },
  },
});
