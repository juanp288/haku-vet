"use client";

import { useQueryClient } from "@tanstack/react-query";
import { tsr } from "@/lib/api-client";

export function useCreateConsultation() {
  return tsr.consultations.create.useMutation({});
}

export function useConsultation(id: string) {
  return tsr.consultations.getById.useQuery({
    queryKey: ["consultation", id],
    queryData: { params: { id } },
  });
}

/** D1: "guardado automático" — sin invalidar la query en cada guardado, la respuesta ya trae el estado actualizado. */
export function useUpdateConsultationDraft(id: string) {
  const queryClient = useQueryClient();
  return tsr.consultations.updateDraft.useMutation({
    onSuccess: (result) => {
      queryClient.setQueryData(["consultation", id], { status: 200, body: result.body });
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

/** D2: mismo patrón que useUpdateConsultationDraft, endpoint separado (AUXILIAR no tiene acceso al general). */
export function useUpdateConsultationVitals(id: string) {
  const queryClient = useQueryClient();
  return tsr.consultations.updateVitals.useMutation({
    onSuccess: (result) => {
      queryClient.setQueryData(["consultation", id], { status: 200, body: result.body });
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

/** D3: al cerrar, la respuesta ya trae status=CERRADA — el editor cambia solo a la vista de solo lectura. */
export function useCloseConsultation(id: string) {
  const queryClient = useQueryClient();
  return tsr.consultations.close.useMutation({
    onSuccess: (result) => {
      queryClient.setQueryData(["consultation", id], { status: 200, body: result.body });
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
      void queryClient.invalidateQueries({ queryKey: ["agenda"] });
      void queryClient.invalidateQueries({ queryKey: ["agenda-week"] });
    },
  });
}
