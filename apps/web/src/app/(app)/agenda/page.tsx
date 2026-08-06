import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agenda — Kahu",
};

export default function AgendaPage() {
  return (
    <div className="px-6 py-8">
      <h1 className="mb-1 font-heading text-3xl">Agenda del día</h1>
      <p className="text-sm opacity-70">
        La agenda por veterinario (historia C1) llega en una sesión aparte.
      </p>
    </div>
  );
}
