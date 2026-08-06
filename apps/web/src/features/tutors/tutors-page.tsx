"use client";

import { useMemo, useState } from "react";
import { usePatients } from "@/features/patients/use-patients";
import { TutorDetail } from "./tutor-detail";
import { TutorFormDialog } from "./tutor-form-dialog";
import { TutorsTable } from "./tutors-table";
import { useTutors } from "./use-tutors";

export function TutorsPage() {
  const { data: tutorsData, isLoading: isLoadingTutors } = useTutors();
  const { data: patientsData, isLoading: isLoadingPatients } = usePatients();
  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);

  const tutors = tutorsData?.body ?? [];
  const patients = patientsData?.body ?? [];
  const isLoading = isLoadingTutors || isLoadingPatients;

  const effectiveSelectedId = selectedTutorId ?? tutors[0]?.id ?? null;
  const selectedTutor = tutors.find((tutor) => tutor.id === effectiveSelectedId) ?? null;
  const selectedTutorPatients = useMemo(
    () =>
      effectiveSelectedId
        ? patients.filter((patient) =>
            patient.tutors.some((link) => link.tutorId === effectiveSelectedId),
          )
        : [],
    [patients, effectiveSelectedId],
  );

  return (
    <div className="max-w-[1080px] px-6 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px]">Acudientes</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {tutors.length} acudiente{tutors.length === 1 ? "" : "s"} registrados · selecciona
            uno para ver su ficha y sus mascotas
          </p>
        </div>
        <TutorFormDialog onConflict={setSelectedTutorId} />
      </div>

      {isLoading ? (
        <p className="text-sm opacity-70">Cargando…</p>
      ) : tutors.length === 0 ? (
        <p className="text-sm opacity-70">Todavía no hay acudientes registrados.</p>
      ) : (
        <>
          <div className="mb-6">
            <TutorsTable
              tutors={tutors}
              patients={patients}
              selectedTutorId={effectiveSelectedId}
              onSelect={setSelectedTutorId}
            />
          </div>

          {selectedTutor && (
            <>
              <div className="mb-3 flex items-center gap-2.5">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.11em] text-neutral-500">
                  Ficha del acudiente
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <TutorDetail tutor={selectedTutor} patients={selectedTutorPatients} />
            </>
          )}
        </>
      )}
    </div>
  );
}
