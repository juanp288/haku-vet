"use client";

import { tsr } from "@/lib/api-client";

export const PATIENTS_QUERY_KEY = ["patients"];

export function useCreatePatient() {
  return tsr.patients.create.useMutation();
}
