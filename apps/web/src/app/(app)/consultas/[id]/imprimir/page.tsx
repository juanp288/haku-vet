import type { Metadata } from "next";
import { ConsultationPrintView } from "@/features/consultations/consultation-print-view";

export const metadata: Metadata = {
  title: "Imprimir consulta — Kahu",
};

export default async function ConsultationPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ConsultationPrintView consultationId={id} />;
}
