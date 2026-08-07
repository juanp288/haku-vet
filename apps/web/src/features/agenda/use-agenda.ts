"use client";

import { tsr } from "@/lib/api-client";

/** C1: "la vista se refresca sola cada 60 segundos". */
const REFRESH_INTERVAL_MS = 60_000;

export function useAgenda(date: string | undefined) {
  return tsr.appointments.getAgenda.useQuery({
    queryKey: ["agenda", date ?? "today"],
    queryData: { query: date ? { date } : {} },
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}
