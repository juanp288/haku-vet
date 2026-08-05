"use client";

import { SPECIES_LABELS } from "@/lib/species-labels";
import { LinkTutorDialog } from "./link-tutor-dialog";
import { PatientTutorsTable } from "./patient-tutors-table";
import { usePatient } from "./use-patients";

interface PatientFichaProps {
  patientId: string;
}

export function PatientFicha({ patientId }: PatientFichaProps) {
  const { data, isLoading } = usePatient(patientId);
  const patient = data?.body;

  if (isLoading) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm opacity-70">Cargando…</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm opacity-70">No se encontró la mascota.</p>
      </div>
    );
  }

  const breedLabel = patient.breedName ?? patient.breedOther;
  const subtitle = [SPECIES_LABELS[patient.species], breedLabel, patient.ageLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="px-6 py-8">
      <h1 className="mb-1 font-heading text-3xl">{patient.name}</h1>
      <p className="mb-6 text-sm opacity-70">{subtitle}</p>

      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-xl">Acudientes vinculados</h2>
        <LinkTutorDialog
          patientId={patientId}
          linkedTutorIds={patient.tutors.map((tutor) => tutor.tutorId)}
        />
      </div>
      <PatientTutorsTable patientId={patientId} tutors={patient.tutors} />

      <p className="mt-8 text-sm opacity-70">
        La ficha completa (historia B5) llega en una sesión aparte.
      </p>
    </div>
  );
}
