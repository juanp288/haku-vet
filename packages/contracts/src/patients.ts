import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { errorSchema } from "./common/errors";
import { sexSchema } from "./common/sex";
import { speciesSchema } from "./common/species";

export const createPatientSchema = z
  .object({
    name: z.string().min(1, { message: "El nombre es obligatorio." }).max(80),
    species: speciesSchema,
    speciesOther: z.string().max(60).optional(),
    breedId: z.string().optional(),
    breedOther: z.string().max(80).optional(),
    sex: sexSchema.default("DESCONOCIDO"),
    isNeutered: z.boolean().default(false),
    birthDate: z.string().optional(),
    birthDateIsApprox: z.boolean().default(false),
    color: z.string().max(60).optional(),
    microchip: z.string().max(40).optional(),
    tutorId: z.string().min(1, { message: "Debe vincular al menos un acudiente." }),
    tutorRelationship: z.string().max(60).optional(),
  })
  .refine((data) => data.species !== "OTRO" || !!data.speciesOther?.trim(), {
    message: "Debe indicar la especie cuando selecciona 'Otro'.",
    path: ["speciesOther"],
  })
  .refine((data) => !(data.breedId && data.breedOther?.trim()), {
    message: "Seleccione una raza del catálogo o escriba una, no ambas.",
    path: ["breedOther"],
  })
  .refine((data) => !data.birthDate || new Date(data.birthDate) <= new Date(), {
    message: "La fecha de nacimiento no puede ser futura.",
    path: ["birthDate"],
  });
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

/** Un acudiente vinculado a la mascota, tal como lo pide B4 (RN-08). */
export const patientTutorLinkSchema = z.object({
  tutorId: z.string(),
  tutorName: z.string(),
  tutorPhone: z.string(),
  isPrimary: z.boolean(),
  relationship: z.string().nullable(),
});
export type PatientTutorLink = z.infer<typeof patientTutorLinkSchema>;

export const patientSchema = z.object({
  id: z.string(),
  name: z.string(),
  species: speciesSchema,
  speciesOther: z.string().nullable(),
  breedId: z.string().nullable(),
  breedName: z.string().nullable(),
  breedOther: z.string().nullable(),
  sex: sexSchema,
  isNeutered: z.boolean(),
  birthDate: z.string().nullable(),
  birthDateIsApprox: z.boolean(),
  ageLabel: z.string().nullable(),
  color: z.string().nullable(),
  microchip: z.string().nullable(),
  isDeceased: z.boolean(),
  isActive: z.boolean(),
  tutors: z.array(patientTutorLinkSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Patient = z.infer<typeof patientSchema>;

export const linkTutorSchema = z.object({
  tutorId: z.string().min(1, { message: "Debe seleccionar un acudiente." }),
  relationship: z.string().max(60).optional(),
  isPrimary: z.boolean().default(false),
});
export type LinkTutorInput = z.infer<typeof linkTutorSchema>;

const patientIdParamsSchema = z.object({ id: z.string() });
const patientTutorParamsSchema = z.object({ id: z.string(), tutorId: z.string() });

const c = initContract();

export const patientsContract = c.router({
  create: {
    method: "POST",
    path: "/patients",
    body: createPatientSchema,
    responses: {
      201: patientSchema,
      409: errorSchema,
    },
  },
  list: {
    method: "GET",
    path: "/patients",
    responses: {
      200: z.array(patientSchema),
    },
  },
  get: {
    method: "GET",
    path: "/patients/:id",
    pathParams: patientIdParamsSchema,
    responses: {
      200: patientSchema,
      404: errorSchema,
    },
  },
  linkTutor: {
    method: "POST",
    path: "/patients/:id/tutors",
    pathParams: patientIdParamsSchema,
    body: linkTutorSchema,
    responses: {
      201: patientSchema,
      404: errorSchema,
      409: errorSchema,
    },
  },
  setPrimaryTutor: {
    method: "POST",
    path: "/patients/:id/tutors/:tutorId/primary",
    pathParams: patientTutorParamsSchema,
    body: c.noBody(),
    responses: {
      200: patientSchema,
      404: errorSchema,
    },
  },
  unlinkTutor: {
    method: "POST",
    path: "/patients/:id/tutors/:tutorId/unlink",
    pathParams: patientTutorParamsSchema,
    body: c.noBody(),
    responses: {
      200: patientSchema,
      404: errorSchema,
      422: errorSchema,
    },
  },
});
