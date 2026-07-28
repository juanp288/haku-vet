import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administración — Haku Veterinaria",
};

export default function AdminPage() {
  return (
    <div className="px-6 py-8">
      <h1 className="mb-1 font-heading text-3xl">Administración</h1>
      <p className="text-sm opacity-70">
        Usuarios, configuración de la clínica y bitácora (historias A2, A3, G1)
        llegan en sesiones aparte.
      </p>
    </div>
  );
}
