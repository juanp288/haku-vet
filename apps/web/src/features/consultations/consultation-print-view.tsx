"use client";

import { Printer } from "@phosphor-icons/react/dist/csr/Printer";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePatient } from "@/features/patients/use-patients";
import { useClinicSettings } from "@/features/settings/use-settings";
import { getApiErrorMessage } from "@/lib/api-error";
import { SEX_LABELS } from "@/features/patients/sex-labels";
import { SPECIES_LABELS } from "@/lib/species-labels";
import { useConsultation } from "./use-consultations";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PrintField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="mb-3 break-inside-avoid">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-neutral-500">{label}</div>
      <p className="whitespace-pre-wrap text-[13px] text-neutral-900">{value}</p>
    </div>
  );
}

interface ConsultationPrintViewProps {
  consultationId: string;
}

/**
 * D6: "salida en PDF con logo, datos de la clínica, paciente, acudiente y
 * veterinario con su registro profesional". Sin librería de PDF nueva
 * (CLAUDE.md regla 9): esta es una página imprimible normal — el botón
 * "Imprimir" llama a window.print(), y "Guardar como PDF" del navegador
 * (disponible en cualquier PC/tablet, sin internet) produce el PDF. El
 * nav/header de la app se ocultan al imprimir vía print:hidden en AppShell.
 */
export function ConsultationPrintView({ consultationId }: ConsultationPrintViewProps) {
  const { data: consultationData, isLoading: loadingConsultation, error: consultationError } =
    useConsultation(consultationId);
  const consultation = consultationData?.body;
  const { data: patientData } = usePatient(consultation?.patientId ?? "");
  const patient = patientData?.body;
  const { data: settingsData } = useClinicSettings();
  const settings = settingsData?.body;

  if (loadingConsultation) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm opacity-70">Cargando…</p>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-destructive">
          {getApiErrorMessage(consultationError, "No se pudo cargar la consulta.")}
        </p>
      </div>
    );
  }

  if (consultation.status !== "CERRADA") {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-destructive">
          Solo se pueden imprimir consultas cerradas. Cierra la consulta primero.
        </p>
        <Link href={`/consultas/${consultationId}`} className="mt-2 inline-block text-[13px] text-brand-700 hover:underline">
          ← Volver a la consulta
        </Link>
      </div>
    );
  }

  const primaryTutor = patient?.tutors.find((t) => t.isPrimary) ?? patient?.tutors[0];

  return (
    <div className="mx-auto max-w-[720px] px-6 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-5 flex justify-end print:hidden">
        <Button type="button" onClick={() => window.print()}>
          <Printer size={16} weight="bold" />
          Imprimir
        </Button>
      </div>

      <header className="mb-6 flex items-start gap-4 border-b-2 border-neutral-800 pb-4">
        {settings?.logoPath && (
          <img src={`${API_URL}${settings.logoPath}`} alt="" className="h-14 w-14 flex-none object-contain" />
        )}
        <div className="flex-1">
          <h1 className="font-heading text-[20px]">{settings?.name ?? "Clínica Veterinaria"}</h1>
          <p className="text-[12px] text-neutral-600">
            {[settings?.address, settings?.phone, settings?.taxId ? `NIT ${settings.taxId}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="text-right text-[12px] text-neutral-600">
          <div className="font-bold text-neutral-800">Historia clínica</div>
          <div>{formatDateTime(consultation.occurredAt)}</div>
        </div>
      </header>

      <section className="mb-5 grid grid-cols-2 gap-4 text-[13px]">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-neutral-500">Paciente</div>
          <div className="font-bold">{consultation.patientName}</div>
          {patient && (
            <div className="text-neutral-600">
              {[SPECIES_LABELS[patient.species], patient.breedName, SEX_LABELS[patient.sex], patient.ageLabel]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
        </div>
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-neutral-500">Acudiente</div>
          {primaryTutor ? (
            <>
              <div className="font-bold">{primaryTutor.tutorName}</div>
              <div className="text-neutral-600">{primaryTutor.tutorPhone}</div>
            </>
          ) : (
            <div className="text-neutral-500">—</div>
          )}
        </div>
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-neutral-500">Veterinario</div>
          <div className="font-bold">{consultation.vetName}</div>
          {consultation.vetLicenseNumber && (
            <div className="text-neutral-600">Registro profesional: {consultation.vetLicenseNumber}</div>
          )}
        </div>
      </section>

      <section className="mb-5">
        <PrintField label="Motivo de consulta" value={consultation.reason} />
        <div className="grid grid-cols-2 gap-4">
          <PrintField label="S — Subjetivo" value={consultation.subjective} />
          <PrintField label="O — Objetivo" value={consultation.objective} />
          <PrintField label="A — Evaluación" value={consultation.assessment} />
          <PrintField label="P — Plan" value={consultation.plan} />
        </div>
        <PrintField label="Diagnóstico" value={consultation.diagnosis} />
        <PrintField label="Tratamiento" value={consultation.treatment} />

        {(consultation.weightKg !== null || consultation.temperatureC !== null) && (
          <div className="mb-3 flex flex-wrap gap-4 text-[12.5px] text-neutral-700">
            {consultation.weightKg !== null && <span>Peso: {consultation.weightKg} kg</span>}
            {consultation.temperatureC !== null && <span>Temp: {consultation.temperatureC} °C</span>}
            {consultation.heartRate !== null && <span>FC: {consultation.heartRate} lpm</span>}
            {consultation.respiratoryRate !== null && <span>FR: {consultation.respiratoryRate} rpm</span>}
          </div>
        )}
      </section>

      {consultation.prescription && (
        <section className="mb-5 break-inside-avoid rounded-[10px] border-2 border-neutral-800 p-4">
          <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.08em]">Fórmula / Receta</div>
          <p className="whitespace-pre-wrap text-[13.5px]">{consultation.prescription}</p>
        </section>
      )}

      {consultation.addenda.length > 0 && (
        <section className="mb-5">
          <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-neutral-500">Adendas</div>
          {consultation.addenda.map((addendum) => (
            <div key={addendum.id} className="mb-2 break-inside-avoid border-l-2 border-neutral-400 pl-3 text-[12.5px]">
              <div className="font-semibold text-neutral-700">
                {addendum.authorName} · {formatDateTime(addendum.createdAt)}
              </div>
              <p className="whitespace-pre-wrap text-neutral-800">{addendum.content}</p>
            </div>
          ))}
        </section>
      )}

      <footer className="mt-8 border-t border-neutral-300 pt-3 text-[10.5px] text-neutral-400">
        Documento generado el {formatDateTime(new Date().toISOString())} · {settings?.name ?? "Clínica Veterinaria"}
      </footer>
    </div>
  );
}
