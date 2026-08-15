"use client";

import { tsr } from "@/lib/api-client";

/** D6: datos públicos de la clínica para la vista de impresión. */
export function useClinicSettings() {
  return tsr.settings.getPublic.useQuery({
    queryKey: ["clinic-settings"],
    staleTime: 5 * 60 * 1000,
  });
}
