import type { Metadata } from "next";
import { AgendaPage } from "@/features/agenda/agenda-page";

export const metadata: Metadata = {
  title: "Agenda — Kahu",
};

export default function Page() {
  return <AgendaPage />;
}
