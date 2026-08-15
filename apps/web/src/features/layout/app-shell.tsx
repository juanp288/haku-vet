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
    // El scroll interno (h-screen + overflow-hidden en el layout, overflow-y-auto
    // en <main>) es solo para pantalla — al imprimir (D6) se revierte a flujo
    // normal (print:h-auto print:overflow-visible) para que el contenido no
    // quede recortado a una sola altura de viewport en el PDF.
    <div className="flex h-screen items-stretch overflow-hidden print:h-auto print:overflow-visible">
      <div className="print:hidden">
        <AppNav />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden print:overflow-visible">
        <div className="print:hidden">
          <AppHeader />
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto print:h-auto print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  );
}
