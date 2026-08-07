import type { Metadata } from "next";
import { WeekPage } from "@/features/agenda/week-page";

export const metadata: Metadata = {
  title: "Vista semanal — Kahu",
};

export default function SemanaPage() {
  return <WeekPage />;
}
