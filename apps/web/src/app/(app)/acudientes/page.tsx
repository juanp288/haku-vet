import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acudientes — VetClínica",
};

export default function AcudientesPage() {
  return (
    <div className="px-6 py-8">
      <h1 className="mb-1 font-heading text-3xl">Acudientes y mascotas</h1>
      <p className="text-sm opacity-70">
        Registro y búsqueda de acudientes (historia B1) llega en una sesión aparte.
      </p>
    </div>
  );
}
