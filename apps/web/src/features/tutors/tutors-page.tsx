"use client";

import { useState } from "react";
import { SearchBar } from "@/features/search/search-bar";
import { TutorFormDialog } from "./tutor-form-dialog";
import { TutorsTable } from "./tutors-table";
import { useTutors } from "./use-tutors";

export function TutorsPage() {
  const { data, isLoading } = useTutors();
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const tutors = data?.body ?? [];
  const highlightedTutor = highlightId
    ? tutors.find((tutor) => tutor.id === highlightId)
    : undefined;

  return (
    <div className="px-6 py-8">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="font-heading text-3xl">Acudientes y mascotas</h1>
        <TutorFormDialog onConflict={setHighlightId} />
      </div>

      <SearchBar />

      <h2 className="mb-3 font-heading text-xl">Todos los acudientes</h2>

      {highlightId && (
        <p className="mb-4 text-[13px] text-brand-2-700">
          Ya existe un acudiente con ese documento
          {highlightedTutor
            ? `: ${highlightedTutor.firstName} ${highlightedTutor.lastName} (resaltado abajo).`
            : "."}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm opacity-70">Cargando…</p>
      ) : (
        <TutorsTable tutors={tutors} highlightId={highlightId} />
      )}
    </div>
  );
}
