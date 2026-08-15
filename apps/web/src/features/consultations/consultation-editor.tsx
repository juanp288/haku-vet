"use client";

import type { ConsultationDetail, UpdateConsultationDraftInput } from "@vetclinic/contracts";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/features/auth/use-auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { CONSULTATION_STATUS_CLASSES, CONSULTATION_STATUS_LABELS } from "../patients/consultation-status-labels";
import { useConsultation, useUpdateConsultationDraft } from "./use-consultations";
import { VitalsEditor, VitalsReadOnly } from "./vitals-editor";

const AUTOSAVE_DEBOUNCE_MS = 1200;
const AUTOSAVE_INTERVAL_MS = 30_000;

interface DraftFields {
  reason: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
  nextControlAt: string;
}

function toDraftFields(detail: ConsultationDetail): DraftFields {
  return {
    reason: detail.reason ?? "",
    subjective: detail.subjective ?? "",
    objective: detail.objective ?? "",
    assessment: detail.assessment ?? "",
    plan: detail.plan ?? "",
    diagnosis: detail.diagnosis ?? "",
    treatment: detail.treatment ?? "",
    prescription: detail.prescription ?? "",
    nextControlAt: detail.nextControlAt ? detail.nextControlAt.slice(0, 10) : "",
  };
}

function toUpdatePayload(fields: DraftFields): UpdateConsultationDraftInput {
  const nullable = (value: string): string | null => (value.trim() ? value : null);
  return {
    ...(fields.reason.trim() ? { reason: fields.reason.trim() } : {}),
    subjective: nullable(fields.subjective),
    objective: nullable(fields.objective),
    assessment: nullable(fields.assessment),
    plan: nullable(fields.plan),
    diagnosis: nullable(fields.diagnosis),
    treatment: nullable(fields.treatment),
    prescription: nullable(fields.prescription),
    nextControlAt: fields.nextControlAt ? fields.nextControlAt : null,
  };
}

function fieldsEqual(a: DraftFields, b: DraftFields): boolean {
  return (Object.keys(a) as (keyof DraftFields)[]).every((key) => a[key] === b[key]);
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function SaveStatusLabel({ status }: { status: SaveStatus }) {
  if (status === "saving") return <span className="text-neutral-500">Guardando…</span>;
  if (status === "saved") return <span className="text-brand-2-700">Borrador guardado</span>;
  if (status === "error") return <span className="text-destructive">No se pudo guardar</span>;
  return null;
}

function SoapEditor({ consultation }: { consultation: ConsultationDetail }) {
  const [fields, setFields] = useState<DraftFields>(() => toDraftFields(consultation));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const lastSavedRef = useRef<DraftFields>(toDraftFields(consultation));
  const fieldsRef = useRef(fields);
  const updateDraft = useUpdateConsultationDraft(consultation.id);

  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  const save = (current: DraftFields) => {
    if (fieldsEqual(current, lastSavedRef.current)) {
      return;
    }
    setSaveStatus("saving");
    updateDraft.mutate(
      { params: { id: consultation.id }, body: toUpdatePayload(current) },
      {
        onSuccess: () => {
          lastSavedRef.current = current;
          setSaveStatus("saved");
        },
        onError: () => setSaveStatus("error"),
      },
    );
  };

  // Autoguardado al cambiar de campo (debounce corto tras la última edición).
  useEffect(() => {
    const timeout = setTimeout(() => save(fields), AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [fields]);

  // Autoguardado cada 30s como red de seguridad — temporizador estable, NO se
  // reinicia con cada tecla (si dependiera de `fields` nunca dispararía
  // mientras el usuario escribe seguido). Lee el valor más reciente vía ref.
  useEffect(() => {
    const interval = setInterval(() => save(fieldsRef.current), AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
    // Temporizador estable a propósito — no depende de `save`/`fields` (ver comentario arriba).
  }, []);

  const set = (key: keyof DraftFields) => (value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  const errorMessage = getApiErrorMessage(updateDraft.error, "No se pudo guardar el borrador.");

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between rounded-[12px] border border-border bg-card px-4 py-2.5">
        <span className="text-[12.5px] text-neutral-500">Los cambios se guardan automáticamente.</span>
        <span className="text-[12.5px] font-semibold">
          <SaveStatusLabel status={saveStatus} />
        </span>
      </div>
      {saveStatus === "error" && errorMessage && (
        <p className="text-[13px] text-destructive">{errorMessage}</p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="reason">Motivo de la consulta</Label>
        <Input id="reason" value={fields.reason} onChange={(e) => set("reason")(e.target.value)} />
        {!fields.reason.trim() && (
          <p className="text-[12.5px] text-destructive">El motivo es obligatorio.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="subjective">S — Subjetivo</Label>
          <Textarea
            id="subjective"
            placeholder="Lo que reporta el tutor…"
            value={fields.subjective}
            onChange={(e) => set("subjective")(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="objective">O — Objetivo</Label>
          <Textarea
            id="objective"
            placeholder="Hallazgos del examen físico…"
            value={fields.objective}
            onChange={(e) => set("objective")(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="assessment">A — Evaluación</Label>
          <Textarea
            id="assessment"
            placeholder="Impresión clínica…"
            value={fields.assessment}
            onChange={(e) => set("assessment")(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="plan">P — Plan</Label>
          <Textarea
            id="plan"
            placeholder="Plan a seguir…"
            value={fields.plan}
            onChange={(e) => set("plan")(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="diagnosis">Diagnóstico</Label>
          <Textarea
            id="diagnosis"
            value={fields.diagnosis}
            onChange={(e) => set("diagnosis")(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="treatment">Tratamiento</Label>
          <Textarea
            id="treatment"
            value={fields.treatment}
            onChange={(e) => set("treatment")(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="prescription">Prescripción</Label>
          <Textarea
            id="prescription"
            value={fields.prescription}
            onChange={(e) => set("prescription")(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nextControlAt">Próximo control</Label>
          <Input
            id="nextControlAt"
            type="date"
            value={fields.nextControlAt}
            onChange={(e) => set("nextControlAt")(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-neutral-500">{label}</div>
      <p className="whitespace-pre-wrap text-[13.5px] text-neutral-800">{value}</p>
    </div>
  );
}

function ClosedConsultationView({ consultation }: { consultation: ConsultationDetail }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-[12px] border border-border bg-muted/40 px-4 py-2.5 text-[13px] text-neutral-600">
        Esta consulta está cerrada: la historia clínica es inmutable (RN-05).
      </div>
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
    </div>
  );
}

interface ConsultationEditorProps {
  consultationId: string;
}

export function ConsultationEditor({ consultationId }: ConsultationEditorProps) {
  const { data: currentUser } = useCurrentUser();
  const { data, isLoading, isError, error } = useConsultation(consultationId);
  const consultation = data?.body;
  const role = currentUser?.body.role;
  const canEditSoap = role === "VETERINARIO" || role === "ADMIN";

  if (isLoading) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm opacity-70">Cargando…</p>
      </div>
    );
  }

  if (isError || !consultation) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-destructive">
          {getApiErrorMessage(error, "No se pudo cargar la consulta.")}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[820px] px-6 py-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/pacientes/${consultation.patientId}`}
            className="text-[13px] font-semibold text-brand-700 hover:underline"
          >
            ← {consultation.patientName}
          </Link>
          <h1 className="mt-1 font-heading text-[24px]">Consulta</h1>
          <p className="mt-1 text-[13px] text-neutral-600">
            {consultation.vetName} · {new Date(consultation.occurredAt).toLocaleString("es-CO")}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${CONSULTATION_STATUS_CLASSES[consultation.status]}`}
        >
          {CONSULTATION_STATUS_LABELS[consultation.status]}
        </span>
      </div>

      {consultation.status === "CERRADA" ? (
        <ClosedConsultationView consultation={consultation} />
      ) : (
        <div className="grid gap-6">
          {canEditSoap && <SoapEditor key={consultation.id} consultation={consultation} />}
          <VitalsEditor key={consultation.id} consultation={consultation} />
        </div>
      )}
    </div>
  );
}
