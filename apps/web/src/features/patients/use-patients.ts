"use client";

import { useQueryClient } from "@tanstack/react-query";
import { tsr } from "@/lib/api-client";

export const PATIENTS_QUERY_KEY = ["patients"];
export const patientQueryKey = (patientId: string) => ["patients", patientId];

export function usePatients() {
  return tsr.patients.list.useQuery({ queryKey: PATIENTS_QUERY_KEY });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return tsr.patients.create.useMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PATIENTS_QUERY_KEY });
    },
  });
}

export function usePatient(patientId: string) {
  return tsr.patients.get.useQuery({
    queryKey: patientQueryKey(patientId),
    queryData: { params: { id: patientId } },
  });
}

/** B5: historia clínica paginada — vacía hasta que D1 exista, pero la consulta ya es real. */
export function usePatientConsultations(patientId: string, page: number) {
  return tsr.patients.listConsultations.useQuery({
    queryKey: [...patientQueryKey(patientId), "consultations", page],
    queryData: { params: { id: patientId }, query: { page } },
  });
}

function useInvalidatePatientQueries(patientId: string) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: patientQueryKey(patientId) }),
      queryClient.invalidateQueries({ queryKey: PATIENTS_QUERY_KEY }),
    ]);
  };
}

export function useLinkTutor(patientId: string) {
  const invalidate = useInvalidatePatientQueries(patientId);
  return tsr.patients.linkTutor.useMutation({
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useSetPrimaryTutor(patientId: string) {
  const invalidate = useInvalidatePatientQueries(patientId);
  return tsr.patients.setPrimaryTutor.useMutation({
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useUnlinkTutor(patientId: string) {
  const invalidate = useInvalidatePatientQueries(patientId);
  return tsr.patients.unlinkTutor.useMutation({
    onSuccess: async () => {
      await invalidate();
    },
  });
}
