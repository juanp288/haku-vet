import type { Metadata } from "next";
import { TutorsPage } from "@/features/tutors/tutors-page";

export const metadata: Metadata = {
  title: "Acudientes — Haku Veterinaria",
};

export default function AcudientesPage() {
  return <TutorsPage />;
}
