"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { tsr } from "@/lib/api-client";

export const CURRENT_USER_QUERY_KEY = ["auth", "me"];

/** Usuario actual. `retry: false` — un 401 significa "no hay sesión", no una falla de red. */
export function useCurrentUser() {
  return tsr.auth.me.useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return tsr.auth.login.useMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return tsr.auth.logout.useMutation({
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

const SILENT_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

/**
 * A1: "refresco silencioso mientras la pestaña esté activa". Sin refresh
 * token (doc 05 §4) — reemite la misma cookie con un `exp` nuevo usando el
 * access token todavía válido.
 */
export function useSessionRefresh(enabled: boolean): void {
  const refresh = tsr.auth.refresh.useMutation();

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh.mutate({ body: {} });
      }
    }, SILENT_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled]);
}
