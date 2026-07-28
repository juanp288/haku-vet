import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ficha de la mascota — VetClínica",
};

export default async function PatientFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="px-6 py-8">
      <h1 className="mb-1 font-heading text-3xl">Ficha de la mascota</h1>
      <p className="text-sm opacity-70">
        La ficha completa (historia B5) llega en una sesión aparte. Paciente: {id}
      </p>
    </div>
  );
}
