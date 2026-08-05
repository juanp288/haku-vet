"use client";

import { useQueryClient } from "@tanstack/react-query";
import { tsr } from "@/lib/api-client";

export const PATIENTS_QUERY_KEY = ["patients"];
export const patientQueryKey = (patientId: string) => ["patients", patientId];

export function useCreatePatient() {
  return tsr.patients.create.useMutation();
}

export function usePatient(patientId: string) {
  return tsr.patients.get.useQuery({
    queryKey: patientQueryKey(patientId),
    queryData: { params: { id: patientId } },
  });
}

function useInvalidatePatient(patientId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: patientQueryKey(patientId) });
}

export function useLinkTutor(patientId: string) {
  const invalidate = useInvalidatePatient(patientId);
  return tsr.patients.linkTutor.useMutation({
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useSetPrimaryTutor(patientId: string) {
  const invalidate = useInvalidatePatient(patientId);
  return tsr.patients.setPrimaryTutor.useMutation({
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useUnlinkTutor(patientId: string) {
  const invalidate = useInvalidatePatient(patientId);
  return tsr.patients.unlinkTutor.useMutation({
    onSuccess: async () => {
      await invalidate();
    },
  });
}
