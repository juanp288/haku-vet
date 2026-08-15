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
      <div className="print:hidden">
        <AppNav />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="print:hidden">
          <AppHeader />
        </div>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
