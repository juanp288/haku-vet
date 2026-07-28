import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { errorSchema } from "./common/errors";

/** Debe permanecer sincronizado con el enum DocumentType de schema.prisma. */
export const documentTypeSchema = z.enum(["CC", "CE", "NIT", "PASAPORTE", "OTRO"]);
export type DocumentType = z.infer<typeof documentTypeSchema>;

export const createTutorSchema = z.object({
  documentType: documentTypeSchema.default("CC"),
  documentNumber: z
    .string()
    .min(1, { message: "El número de documento es obligatorio." })
    .max(30),
  firstName: z.string().min(1, { message: "El nombre es obligatorio." }).max(80),
  lastName: z.string().min(1, { message: "El apellido es obligatorio." }).max(80),
  phone: z.string().min(1, { message: "El teléfono es obligatorio." }).max(30),
  phoneAlt: z.string().max(30).optional(),
  email: z
    .union([z.string().email({ message: "Correo inválido." }), z.literal("")])
    .optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  notes: z.string().max(2000).optional(),
  dataConsent: z.boolean().refine((v) => v === true, {
    message: "Debe autorizar el tratamiento de datos personales.",
  }),
});
export type CreateTutorInput = z.infer<typeof createTutorSchema>;

export const tutorSchema = z.object({
  id: z.string(),
  documentType: documentTypeSchema,
  documentNumber: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  phoneAlt: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  notes: z.string().nullable(),
  dataConsent: z.boolean(),
  dataConsentAt: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Tutor = z.infer<typeof tutorSchema>;

const c = initContract();

export const tutorsContract = c.router({
  create: {
    method: "POST",
    path: "/tutors",
    body: createTutorSchema,
    responses: {
      201: tutorSchema,
      409: errorSchema,
    },
  },
  list: {
    method: "GET",
    path: "/tutors",
    responses: {
      200: z.array(tutorSchema),
    },
  },
});
