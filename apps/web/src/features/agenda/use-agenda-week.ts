"use client";

import { tsr } from "@/lib/api-client";

/** Igual que useAgenda (C1): la vista se refresca sola cada 60 segundos. */
const REFRESH_INTERVAL_MS = 60_000;

export function useAgendaWeek(date: string | undefined) {
  return tsr.appointments.getWeek.useQuery({
    queryKey: ["agenda-week", date ?? "today"],
    queryData: { query: date ? { date } : {} },
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}
