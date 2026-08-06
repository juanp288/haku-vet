"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser, useSessionRefresh } from "@/features/auth/use-auth";
import { AppHeader } from "./app-header";
import { AppNav } from "./app-nav";

/** Envuelve todas las rutas autenticadas: sesión, nav, refresco silencioso. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data, isError, isLoading } = useCurrentUser();
  useSessionRefresh(!!data);

  useEffect(() => {
    if (isError) {
      router.replace("/login");
    }
  }, [isError, router]);

  if (isLoading || !data) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-stretch">
      <AppNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
