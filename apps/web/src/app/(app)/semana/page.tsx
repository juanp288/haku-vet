import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vista semanal — VetClínica",
};

export default function SemanaPage() {
  return (
    <div className="px-6 py-8">
      <h1 className="mb-1 font-heading text-3xl">Vista semanal</h1>
      <p className="text-sm opacity-70">
        Planeación de turnos por semana (historia C4) llega en una sesión aparte.
      </p>
    </div>
  );
}
