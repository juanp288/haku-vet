import type { Metadata } from "next";
import { PatientFicha } from "@/features/patients/patient-ficha";

export const metadata: Metadata = {
  title: "Ficha de la mascota — Haku Veterinaria",
};

export default async function PatientFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <PatientFicha patientId={id} />;
}
