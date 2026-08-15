import type { Metadata } from "next";
import { ConsultationEditor } from "@/features/consultations/consultation-editor";

export const metadata: Metadata = {
  title: "Consulta — Kahu",
};

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ConsultationEditor consultationId={id} />;
}
