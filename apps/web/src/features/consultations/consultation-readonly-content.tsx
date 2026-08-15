"use client";

import type { ConsultationDetail } from "@vetclinic/contracts";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/features/auth/use-auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAddAddendum } from "./use-consultations";
import { VitalsReadOnly } from "./vitals-editor";

function ReadOnlyField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-neutral-500">{label}</div>
      <p className="whitespace-pre-wrap text-[13.5px] text-neutral-800">{value}</p>
    </div>
  );
}

function formatAddendumDate(value: string): string {
  return new Date(value).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * D4: "se muestra bajo la consulta, con autor y fecha, visualmente
 * diferenciada" — borde+fondo ámbar para distinguirla claramente del
 * contenido original inmutable de la consulta. "No se edita ni se borra":
 * por eso no hay ningún botón de editar/eliminar acá, ni en el backend.
 */
function AddendaSection({ consultation }: { consultation: ConsultationDetail }) {
  const { data: currentUser } = useCurrentUser();
  const [content, setContent] = useState("");
  const addAddendum = useAddAddendum(consultation.id);

  const canAddAddendum =
    currentUser?.body.id === consultation.vetId || currentUser?.body.role === "ADMIN";

  const handleSubmit = () => {
    if (!content.trim()) {
      return;
    }
    addAddendum.mutate(
      { params: { id: consultation.id }, body: { content: content.trim() } },
      { onSuccess: () => setContent("") },
    );
  };

  const errorMessage = getApiErrorMessage(addAddendum.error, "No se pudo agregar la adenda.");

  if (consultation.addenda.length === 0 && !canAddAddendum) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-neutral-500">
        Adendas
      </div>

      {consultation.addenda.map((addendum) => (
        <div
          key={addendum.id}
          className="rounded-[12px] border border-warning-100 bg-warning-100/60 px-4 py-3"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-[12px] font-semibold text-warning-700">
            <span>{addendum.authorName}</span>
            <span>{formatAddendumDate(addendum.createdAt)}</span>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] text-neutral-800">
            {addendum.content}
          </p>
        </div>
      ))}

      {canAddAddendum && (
        <div className="space-y-1.5">
          <Textarea
            placeholder="Corregir o complementar esta consulta cerrada…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {errorMessage && <p className="text-[13px] text-destructive">{errorMessage}</p>}
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={!content.trim() || addAddendum.isPending}
              onClick={handleSubmit}
            >
              {addAddendum.isPending ? "Agregando…" : "Agregar adenda"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * D3/D5: contenido de solo lectura de una consulta — SOAP, vitales y
 * adendas. Compartido entre la vista de consulta cerrada (D3) y la entrada
 * expandida más reciente de la historia clínica completa (D5), para no
 * duplicar el mismo layout en dos lugares.
 */
export function ConsultationReadOnlyContent({ consultation }: { consultation: ConsultationDetail }) {
  return (
    <div className="grid gap-4">
      <ReadOnlyField label="Motivo" value={consultation.reason} />
      <div className="grid gap-4 sm:grid-cols-2">
        <ReadOnlyField label="S — Subjetivo" value={consultation.subjective} />
        <ReadOnlyField label="O — Objetivo" value={consultation.objective} />
        <ReadOnlyField label="A — Evaluación" value={consultation.assessment} />
        <ReadOnlyField label="P — Plan" value={consultation.plan} />
        <ReadOnlyField label="Diagnóstico" value={consultation.diagnosis} />
        <ReadOnlyField label="Tratamiento" value={consultation.treatment} />
      </div>
      <ReadOnlyField label="Prescripción" value={consultation.prescription} />
      <VitalsReadOnly consultation={consultation} />
      <AddendaSection consultation={consultation} />
    </div>
  );
}
