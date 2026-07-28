"use client";

import { tsr } from "@/lib/api-client";

export function useSearch(query: string) {
  return tsr.search.search.useQuery({
    queryKey: ["search", query],
    queryData: { query: { q: query } },
    enabled: query.trim().length > 0,
  });
}
