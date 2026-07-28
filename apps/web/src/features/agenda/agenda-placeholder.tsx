"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserMenu } from "@/features/auth/user-menu";
import { useCurrentUser } from "@/features/auth/use-auth";

/**
 * Aterrizaje tras el login (A1). La agenda real (C1, columnas por
 * veterinario) es una historia aparte — esto solo prueba el loop completo:
 * sesión, usuario actual y cierre de sesión.
 */
export function AgendaPlaceholder() {
  const router = useRouter();
  const { data, isError, isLoading } = useCurrentUser();

  useEffect(() => {
    if (isError) {
      router.replace("/login");
    }
  }, [isError, router]);

  if (isLoading || !data) {
    return null;
  }

  return (
    <div>
      <nav className="flex items-center gap-4 px-4 py-3">
        <span className="mr-auto font-heading text-lg font-semibold">
          VetClínica
        </span>
        <UserMenu />
      </nav>
      <div className="px-6 py-8">
        <h1 className="mb-1 font-heading text-3xl">Agenda del día</h1>
        <p className="text-sm opacity-70">
          Sesión iniciada correctamente. La agenda (historia C1) llega en una
          sesión aparte.
        </p>
      </div>
    </div>
  );
}
