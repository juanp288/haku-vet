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

export interface PatientConsultationsFilters {
  vetId?: string;
  from?: string;
  to?: string;
}

/** B5/D5: historia clínica paginada, con filtro opcional por veterinario y rango de fechas. */
export function usePatientConsultations(
  patientId: string,
  page: number,
  filters: PatientConsultationsFilters = {},
) {
  return tsr.patients.listConsultations.useQuery({
    queryKey: [...patientQueryKey(patientId), "consultations", page, filters],
    queryData: { params: { id: patientId }, query: { page, ...filters } },
  });
}

/** D5: "gráfica de evolución del peso" — serie completa, sin paginar. */
export function usePatientWeightHistory(patientId: string) {
  return tsr.patients.weightHistory.useQuery({
    queryKey: [...patientQueryKey(patientId), "weight-history"],
    queryData: { params: { id: patientId } },
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
