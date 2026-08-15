"use client";

import type { ConsultationSummary } from "@vetclinic/contracts";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConsultationReadOnlyContent } from "@/features/consultations/consultation-readonly-content";
import { useConsultation } from "@/features/consultations/use-consultations";
import {
  CONSULTATION_STATUS_CLASSES,
  CONSULTATION_STATUS_LABELS,
} from "./consultation-status-labels";
import { usePatientConsultations, usePatientWeightHistory } from "./use-patients";
import { WeightChart } from "./weight-chart";

const ALL_VETS = "all";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function VitalsChips({ consultation }: { consultation: ConsultationSummary }) {
  return (
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
  );
}

function CollapsedConsultationCard({ consultation }: { consultation: ConsultationSummary }) {
  return (
    <Link
      href={`/consultas/${consultation.id}`}
      className="block rounded-[var(--radius-lg)] border border-border bg-card p-[18px] hover:border-neutral-400"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-[15.5px] font-extrabold">{formatDate(consultation.occurredAt)}</span>
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
      <VitalsChips consultation={consultation} />
    </Link>
  );
}

/** D5: "la consulta más reciente expandida" — trae el detalle completo (SOAP+vitales+adendas) en vez de solo el resumen. */
function ExpandedConsultationCard({ summary }: { summary: ConsultationSummary }) {
  const { data, isLoading } = useConsultation(summary.id);
  const consultation = data?.body;

  return (
    <section className="rounded-[var(--radius-lg)] border-2 border-brand-300 bg-card p-[18px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-[15.5px] font-extrabold">{formatDate(summary.occurredAt)}</span>
        <span className="text-[13px] text-neutral-600">{summary.vetName}</span>
        <span className="flex-1" />
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-extrabold ${CONSULTATION_STATUS_CLASSES[summary.status]}`}
        >
          {CONSULTATION_STATUS_LABELS[summary.status]}
        </span>
      </div>
      <Link
        href={`/consultas/${summary.id}`}
        className="mt-1 inline-block text-[12px] font-semibold text-brand-700 hover:underline"
      >
        Abrir consulta completa →
      </Link>

      <div className="mt-4">
        {isLoading || !consultation ? (
          <p className="text-[13px] opacity-70">Cargando detalle…</p>
        ) : (
          <ConsultationReadOnlyContent consultation={consultation} />
        )}
      </div>
    </section>
  );
}

interface ConsultationsTabProps {
  patientId: string;
}

export function ConsultationsTab({ patientId }: ConsultationsTabProps) {
  const [page, setPage] = useState(1);
  const [vetId, setVetId] = useState(ALL_VETS);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filters = {
    vetId: vetId === ALL_VETS ? undefined : vetId,
    from: from || undefined,
    to: to || undefined,
  };
  const { data, isLoading } = usePatientConsultations(patientId, page, filters);
  const { data: weightData } = usePatientWeightHistory(patientId);
  const result = data?.body;

  const updateFilter = (next: Partial<{ vetId: string; from: string; to: string }>) => {
    if (next.vetId !== undefined) setVetId(next.vetId);
    if (next.from !== undefined) setFrom(next.from);
    if (next.to !== undefined) setTo(next.to);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {result && result.availableVets.length > 0 && (
        <div className="flex flex-wrap items-end gap-3 rounded-[12px] border border-border bg-card p-3">
          <div className="space-y-1">
            <Label htmlFor="hist-vet" className="text-[11px] text-neutral-500">
              Veterinario
            </Label>
            <Select value={vetId} onValueChange={(value) => updateFilter({ vetId: value })}>
              <SelectTrigger id="hist-vet" className="h-8 w-[190px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VETS}>Todos</SelectItem>
                {result.availableVets.map((vet) => (
                  <SelectItem key={vet.id} value={vet.id}>
                    {vet.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="hist-from" className="text-[11px] text-neutral-500">
              Desde
            </Label>
            <Input
              id="hist-from"
              type="date"
              className="h-8 w-[150px] text-[13px]"
              value={from}
              onChange={(e) => updateFilter({ from: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="hist-to" className="text-[11px] text-neutral-500">
              Hasta
            </Label>
            <Input
              id="hist-to"
              type="date"
              className="h-8 w-[150px] text-[13px]"
              value={to}
              onChange={(e) => updateFilter({ to: e.target.value })}
            />
          </div>
          {(vetId !== ALL_VETS || from || to) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => updateFilter({ vetId: ALL_VETS, from: "", to: "" })}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      )}

      {weightData && weightData.body.length > 0 && (
        <div className="rounded-[var(--radius-lg)] border border-border bg-card p-[18px]">
          <h3 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.05em] text-neutral-500">
            Evolución del peso
          </h3>
          <WeightChart points={weightData.body} />
        </div>
      )}

      {isLoading ? (
        <p className="text-sm opacity-70">Cargando…</p>
      ) : !result || result.items.length === 0 ? (
        <div className="rounded-[13px] border border-dashed border-neutral-300 px-3 py-[26px] text-center text-[13px] text-neutral-500">
          {vetId !== ALL_VETS || from || to
            ? "Ningún registro coincide con estos filtros."
            : "Aún no hay consultas registradas."}
        </div>
      ) : (
        <div>
          <div className="flex flex-col gap-2.5">
            {result.items.map((consultation, index) =>
              page === 1 && index === 0 ? (
                <ExpandedConsultationCard key={consultation.id} summary={consultation} />
              ) : (
                <CollapsedConsultationCard key={consultation.id} consultation={consultation} />
              ),
            )}
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
      )}
    </div>
  );
}
