import type { Metadata } from "next";
import { AgendaPlaceholder } from "@/features/agenda/agenda-placeholder";

export const metadata: Metadata = {
  title: "Agenda — VetClínica",
};

export default function AgendaPage() {
  return <AgendaPlaceholder />;
}
