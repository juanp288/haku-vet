import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recordatorios — Haku Veterinaria",
};

export default function RecordatoriosPage() {
  return (
    <div className="px-6 py-8">
      <h1 className="mb-1 font-heading text-3xl">Bandeja de recordatorios</h1>
      <p className="text-sm opacity-70">
        Vacunas y controles pendientes (historia E3) llega en una sesión aparte.
      </p>
    </div>
  );
}
