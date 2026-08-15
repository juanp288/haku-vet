"use client";

import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { useState } from "react";
import { NewConsultationDialog } from "@/features/consultations/new-consultation-dialog";
import { getAvatarColors } from "@/lib/avatar";
import { SPECIES_LABELS } from "@/lib/species-labels";
import { ConsultationsTab } from "./consultations-tab";
import { LinkTutorDialog } from "./link-tutor-dialog";
import { PatientTutorsTable } from "./patient-tutors-table";
import { SEX_LABELS } from "./sex-labels";
import { SPECIES_ICONS } from "./species-icons";
import { usePatient } from "./use-patients";

type TabKey = "historia" | "vacunas" | "citas" | "adjuntos" | "acudientes";

const TABS: { key: TabKey; label: string }[] = [
  { key: "historia", label: "Historia clínica" },
  { key: "vacunas", label: "Vacunas" },
  { key: "citas", label: "Citas" },
  { key: "adjuntos", label: "Adjuntos" },
  { key: "acudientes", label: "Acudientes" },
];

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="rounded-[13px] border border-dashed border-neutral-300 px-3 py-[26px] text-center text-[13px] text-neutral-500">
      {message}
    </div>
  );
}

interface PatientFichaProps {
  patientId: string;
}

export function PatientFicha({ patientId }: PatientFichaProps) {
  const { data, isLoading } = usePatient(patientId);
  const patient = data?.body;
  const [tab, setTab] = useState<TabKey>("historia");

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
  const subtitle = [SPECIES_LABELS[patient.species], breedLabel, SEX_LABELS[patient.sex], patient.ageLabel]
    .filter(Boolean)
    .join(" · ");
  const primaryTutor = patient.tutors.find((t) => t.isPrimary);
  const SpeciesIcon = SPECIES_ICONS[patient.species];
  const colors = getAvatarColors(patient.id);
  const alerts = [patient.allergies, patient.chronicConditions, patient.clinicalAlert].filter(
    (value): value is string => Boolean(value),
  );

  return (
    <div className="max-w-[1000px] px-6 py-8">
      <section className="mb-4 rounded-[var(--radius-lg)] border border-border bg-card p-[22px]">
        <div className="flex flex-wrap items-start gap-[18px]">
          <div
            className={`flex h-[74px] w-[74px] flex-none items-center justify-center rounded-[22px] text-[36px] ${colors.tint} ${colors.ink}`}
          >
            <SpeciesIcon weight="duotone" />
          </div>
          <div className="min-w-[240px] flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-heading text-[27px] tracking-[-0.022em]">{patient.name}</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.05em] ${
                  patient.isDeceased ? "bg-neutral-200 text-neutral-700" : "bg-brand-2-100 text-brand-2-700"
                }`}
              >
                {patient.isDeceased ? "Fallecida" : "Activa"}
              </span>
            </div>
            <p className="mt-1.5 text-[13.5px] text-neutral-700">{subtitle}</p>
            {primaryTutor && (
              <p className="mt-0.5 text-[13px] text-neutral-500">
                Acudiente: {primaryTutor.tutorName} · {primaryTutor.tutorPhone}
                {patient.microchip ? ` · Microchip ${patient.microchip}` : ""}
              </p>
            )}
          </div>
          {patient.latestWeightKg !== null && (
            <div className="rounded-[12px] border border-border bg-muted/50 px-4 py-2.5">
              <div className="text-[10.5px] font-extrabold uppercase tracking-[0.09em] text-neutral-500">
                Último peso
              </div>
              <div className="mt-0.5 text-[17px] font-extrabold">{patient.latestWeightKg} kg</div>
            </div>
          )}
        </div>

        {alerts.length > 0 && (
          <div className="mt-[14px] flex items-start gap-2.5 rounded-[12px] border border-danger-100 bg-danger-100 px-3.5 py-2.5 text-[13px] text-danger-700">
            <WarningCircle size={18} weight="duotone" className="mt-0.5 flex-none" />
            <span>
              <strong>Alertas clínicas:</strong> {alerts.join(" · ")}
            </span>
          </div>
        )}

        {patient.isDeceased && (
          <div className="mt-[14px] rounded-[12px] border border-neutral-300 bg-neutral-100 px-3.5 py-2.5 text-[13px] text-neutral-700">
            Esta mascota está marcada como fallecida
            {patient.deceasedAt ? ` desde ${new Date(patient.deceasedAt).toLocaleDateString("es-CO")}` : ""}
            . La historia clínica sigue disponible para consulta.
          </div>
        )}
      </section>

      <div className="mb-4 flex w-max max-w-full gap-1.5 overflow-x-auto rounded-[12px] border border-border bg-card p-[5px]">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`whitespace-nowrap rounded-[9px] px-[15px] py-2 text-[13.5px] font-semibold transition-colors ${
              tab === item.key
                ? "bg-foreground text-background font-bold"
                : "text-neutral-600 hover:bg-muted"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "historia" && (
        <div>
          {!patient.isDeceased && (
            <div className="mb-3 flex justify-end">
              <NewConsultationDialog patientId={patientId} />
            </div>
          )}
          <ConsultationsTab patientId={patientId} />
        </div>
      )}
      {tab === "vacunas" && <EmptyTab message="Aún no hay vacunas registradas (historia E1)." />}
      {tab === "citas" && <EmptyTab message="Aún no hay citas registradas (historia C1)." />}
      {tab === "adjuntos" && <EmptyTab message="Aún no hay adjuntos (historia F1)." />}
      {tab === "acudientes" && (
        <div>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.11em] text-neutral-500">
              Acudientes vinculados
            </span>
            <LinkTutorDialog
              patientId={patientId}
              linkedTutorIds={patient.tutors.map((t) => t.tutorId)}
            />
          </div>
          <PatientTutorsTable patientId={patientId} tutors={patient.tutors} />
        </div>
      )}
    </div>
  );
}
