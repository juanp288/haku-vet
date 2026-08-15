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
