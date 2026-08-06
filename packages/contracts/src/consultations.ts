import { z } from "zod";

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
