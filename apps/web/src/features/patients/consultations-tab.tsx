"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CONSULTATION_STATUS_CLASSES,
  CONSULTATION_STATUS_LABELS,
} from "./consultation-status-labels";
import { usePatientConsultations } from "./use-patients";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface ConsultationsTabProps {
  patientId: string;
}

export function ConsultationsTab({ patientId }: ConsultationsTabProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePatientConsultations(patientId, page);
  const result = data?.body;

  if (isLoading) {
    return <p className="text-sm opacity-70">Cargando…</p>;
  }

  if (!result || result.items.length === 0) {
    return (
      <div className="rounded-[13px] border border-dashed border-neutral-300 px-3 py-[26px] text-center text-[13px] text-neutral-500">
        Aún no hay consultas registradas.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-2.5">
        {result.items.map((consultation) => (
          <section
            key={consultation.id}
            className="rounded-[var(--radius-lg)] border border-border bg-card p-[18px]"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[15.5px] font-extrabold">
                {formatDate(consultation.occurredAt)}
              </span>
              <span className="text-[13px] text-neutral-600">{consultation.vetName}</span>
              <span className="flex-1" />
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-extrabold ${CONSULTATION_STATUS_CLASSES[consultation.status]}`}
              >
                {CONSULTATION_STATUS_LABELS[consultation.status]}
              </span>
            </div>
            {(consultation.reason ?? consultation.diagnosis) && (
              <p className="mt-2.5 text-[13.5px] text-neutral-700">
                {consultation.reason && (
                  <>
                    <strong>Motivo:</strong> {consultation.reason}
                  </>
                )}
                {consultation.reason && consultation.diagnosis && " · "}
                {consultation.diagnosis && (
                  <>
                    <strong>Diagnóstico:</strong> {consultation.diagnosis}
                  </>
                )}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {consultation.weightKg !== null && (
                <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-neutral-700">
                  Peso {consultation.weightKg} kg
                </span>
              )}
              {consultation.temperatureC !== null && (
                <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-neutral-700">
                  Temp {consultation.temperatureC} °C
                </span>
              )}
              {consultation.heartRate !== null && (
                <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-neutral-700">
                  FC {consultation.heartRate} lpm
                </span>
              )}
              {consultation.respiratoryRate !== null && (
                <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-neutral-700">
                  FR {consultation.respiratoryRate} rpm
                </span>
              )}
            </div>
          </section>
        ))}
      </div>

      {result.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Anterior
          </Button>
          <span className="text-[13px] text-neutral-600">
            Página {result.page} de {result.totalPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page >= result.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
