import type { Metadata } from "next";
import { TutorsPage } from "@/features/tutors/tutors-page";

export const metadata: Metadata = {
  title: "Acudientes — VetClínica",
};

export default function AcudientesPage() {
  return <TutorsPage />;
}
