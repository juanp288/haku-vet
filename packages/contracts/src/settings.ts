import { initContract } from "@ts-rest/core";
import { z } from "zod";

/**
 * D6: "salida en PDF con logo, datos de la clínica" — el subconjunto
 * público de ClinicSettings que necesita la vista de impresión. No incluye
 * nada de configuración de agenda (eso es ClinicTimeService, uso interno).
 */
export const clinicSettingsPublicSchema = z.object({
  name: z.string(),
  taxId: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  logoPath: z.string().nullable(),
});
export type ClinicSettingsPublic = z.infer<typeof clinicSettingsPublicSchema>;

const c = initContract();

export const settingsContract = c.router({
  getPublic: {
    method: "GET",
    path: "/clinic-settings",
    responses: {
      200: clinicSettingsPublicSchema,
    },
  },
});
