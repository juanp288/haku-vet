"use client";

import { VITAL_SIGN_RANGES, type ConsultationDetail, type UpdateVitalsInput } from "@vetclinic/contracts";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import { useUpdateConsultationVitals } from "./use-consultations";

const AUTOSAVE_DEBOUNCE_MS = 1200;
const AUTOSAVE_INTERVAL_MS = 30_000;

interface VitalsFields {
  weightKg: string;
  temperatureC: string;
  heartRate: string;
  respiratoryRate: string;
  bodyConditionScore: string;
  mucousMembranes: string;
  capillaryRefill: string;
}

function toVitalsFields(detail: ConsultationDetail): VitalsFields {
  return {
    weightKg: detail.weightKg !== null ? String(detail.weightKg) : "",
    temperatureC: detail.temperatureC !== null ? String(detail.temperatureC) : "",
    heartRate: detail.heartRate !== null ? String(detail.heartRate) : "",
    respiratoryRate: detail.respiratoryRate !== null ? String(detail.respiratoryRate) : "",
    bodyConditionScore: detail.bodyConditionScore !== null ? String(detail.bodyConditionScore) : "",
    mucousMembranes: detail.mucousMembranes ?? "",
    capillaryRefill: detail.capillaryRefill !== null ? String(detail.capillaryRefill) : "",
  };
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toVitalsPayload(fields: VitalsFields): UpdateVitalsInput {
  return {
    weightKg: parseNumber(fields.weightKg),
    temperatureC: parseNumber(fields.temperatureC),
    heartRate: parseNumber(fields.heartRate),
    respiratoryRate: parseNumber(fields.respiratoryRate),
    bodyConditionScore: parseNumber(fields.bodyConditionScore),
    mucousMembranes: fields.mucousMembranes.trim() ? fields.mucousMembranes : null,
    capillaryRefill: parseNumber(fields.capillaryRefill),
  };
}

function fieldsEqual(a: VitalsFields, b: VitalsFields): boolean {
  return (Object.keys(a) as (keyof VitalsFields)[]).every((key) => a[key] === b[key]);
}

/** D2: "un valor fuera de rango fisiológico advierte pero no bloquea" — solo texto informativo, nunca deshabilita el guardado. */
function rangeWarning(value: string, range: { min: number; max: number; unit: string }): string | null {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  if (parsed < range.min || parsed > range.max) {
    return `Fuera del rango habitual (${range.min}–${range.max} ${range.unit}).`;
  }
  return null;
}

function weightChangeLabel(current: string, previousWeightKg: number | null): string | null {
  if (previousWeightKg === null) return null;
  const parsed = parseNumber(current);
  if (parsed === null) return `Anterior: ${previousWeightKg} kg`;
  const deltaPct = ((parsed - previousWeightKg) / previousWeightKg) * 100;
  const sign = deltaPct > 0 ? "+" : "";
  return `Anterior: ${previousWeightKg} kg (${sign}${deltaPct.toFixed(1)}%)`;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function SaveStatusLabel({ status }: { status: SaveStatus }) {
  if (status === "saving") return <span className="text-neutral-500">Guardando…</span>;
  if (status === "saved") return <span className="text-brand-2-700">Guardado</span>;
  if (status === "error") return <span className="text-destructive">No se pudo guardar</span>;
  return null;
}

export function VitalsEditor({ consultation }: { consultation: ConsultationDetail }) {
  const [fields, setFields] = useState<VitalsFields>(() => toVitalsFields(consultation));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const lastSavedRef = useRef<VitalsFields>(toVitalsFields(consultation));
  const fieldsRef = useRef(fields);
  const updateVitals = useUpdateConsultationVitals(consultation.id);

  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  const save = (current: VitalsFields) => {
    if (fieldsEqual(current, lastSavedRef.current)) {
      return;
    }
    setSaveStatus("saving");
    updateVitals.mutate(
      { params: { id: consultation.id }, body: toVitalsPayload(current) },
      {
        onSuccess: () => {
          lastSavedRef.current = current;
          setSaveStatus("saved");
        },
        onError: () => setSaveStatus("error"),
      },
    );
  };

  useEffect(() => {
    const timeout = setTimeout(() => save(fields), AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [fields]);

  useEffect(() => {
    const interval = setInterval(() => save(fieldsRef.current), AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const set = (key: keyof VitalsFields) => (value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  const errorMessage = getApiErrorMessage(updateVitals.error, "No se pudo guardar el signo vital.");
  const weightWarning = rangeWarning(fields.weightKg, VITAL_SIGN_RANGES.weightKg);
  const tempWarning = rangeWarning(fields.temperatureC, VITAL_SIGN_RANGES.temperatureC);
  const hrWarning = rangeWarning(fields.heartRate, VITAL_SIGN_RANGES.heartRate);
  const rrWarning = rangeWarning(fields.respiratoryRate, VITAL_SIGN_RANGES.respiratoryRate);
  const weightChange = weightChangeLabel(fields.weightKg, consultation.previousWeightKg);

  return (
    <div className="grid gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-[18px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[14.5px] font-extrabold">Signos vitales</h2>
        <span className="text-[12.5px] font-semibold">
          <SaveStatusLabel status={saveStatus} />
        </span>
      </div>
      {saveStatus === "error" && errorMessage && (
        <p className="text-[13px] text-destructive">{errorMessage}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="weightKg">Peso (kg)</Label>
          <Input
            id="weightKg"
            type="number"
            step="0.01"
            value={fields.weightKg}
            onChange={(e) => set("weightKg")(e.target.value)}
          />
          {weightChange && <p className="text-[12px] text-neutral-500">{weightChange}</p>}
          {weightWarning && <p className="text-[12px] text-warning-700">{weightWarning}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="temperatureC">Temperatura (°C)</Label>
          <Input
            id="temperatureC"
            type="number"
            step="0.1"
            value={fields.temperatureC}
            onChange={(e) => set("temperatureC")(e.target.value)}
          />
          {tempWarning && <p className="text-[12px] text-warning-700">{tempWarning}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="heartRate">Frecuencia cardíaca (lpm)</Label>
          <Input
            id="heartRate"
            type="number"
            step="1"
            value={fields.heartRate}
            onChange={(e) => set("heartRate")(e.target.value)}
          />
          {hrWarning && <p className="text-[12px] text-warning-700">{hrWarning}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="respiratoryRate">Frecuencia respiratoria (rpm)</Label>
          <Input
            id="respiratoryRate"
            type="number"
            step="1"
            value={fields.respiratoryRate}
            onChange={(e) => set("respiratoryRate")(e.target.value)}
          />
          {rrWarning && <p className="text-[12px] text-warning-700">{rrWarning}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bodyConditionScore">Condición corporal (1–9)</Label>
          <Input
            id="bodyConditionScore"
            type="number"
            min={1}
            max={9}
            step="1"
            value={fields.bodyConditionScore}
            onChange={(e) => set("bodyConditionScore")(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="capillaryRefill">Llenado capilar (seg)</Label>
          <Input
            id="capillaryRefill"
            type="number"
            step="0.1"
            value={fields.capillaryRefill}
            onChange={(e) => set("capillaryRefill")(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="mucousMembranes">Mucosas</Label>
          <Input
            id="mucousMembranes"
            placeholder="Ej. Rosadas, húmedas"
            value={fields.mucousMembranes}
            onChange={(e) => set("mucousMembranes")(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function ReadOnlyVital({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-neutral-700">
      {label} {value}
    </div>
  );
}

export function VitalsReadOnly({ consultation }: { consultation: ConsultationDetail }) {
  const hasAny =
    consultation.weightKg !== null ||
    consultation.temperatureC !== null ||
    consultation.heartRate !== null ||
    consultation.respiratoryRate !== null ||
    consultation.bodyConditionScore !== null ||
    consultation.mucousMembranes !== null ||
    consultation.capillaryRefill !== null;

  if (!hasAny) return null;

  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-neutral-500">
        Signos vitales
      </div>
      <div className="flex flex-wrap gap-2">
        <ReadOnlyVital label="Peso" value={consultation.weightKg !== null ? `${consultation.weightKg} kg` : null} />
        <ReadOnlyVital
          label="Temp"
          value={consultation.temperatureC !== null ? `${consultation.temperatureC} °C` : null}
        />
        <ReadOnlyVital label="FC" value={consultation.heartRate !== null ? `${consultation.heartRate} lpm` : null} />
        <ReadOnlyVital
          label="FR"
          value={consultation.respiratoryRate !== null ? `${consultation.respiratoryRate} rpm` : null}
        />
        <ReadOnlyVital
          label="CC"
          value={consultation.bodyConditionScore !== null ? `${consultation.bodyConditionScore}/9` : null}
        />
        <ReadOnlyVital
          label="Llenado capilar"
          value={consultation.capillaryRefill !== null ? `${consultation.capillaryRefill} seg` : null}
        />
        <ReadOnlyVital label="Mucosas" value={consultation.mucousMembranes} />
      </div>
    </div>
  );
}
