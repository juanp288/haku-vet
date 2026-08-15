"use client";

import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { ShieldCheck } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import type { Patient, Tutor } from "@vetclinic/contracts";
import Link from "next/link";
import { PatientFormDialog } from "@/features/patients/patient-form-dialog";
import { SPECIES_ICONS } from "@/features/patients/species-icons";
import { getAvatarColors, getInitials } from "@/lib/avatar";
import { SEX_LABELS } from "@/features/patients/sex-labels";
import { SPECIES_LABELS } from "@/lib/species-labels";
import { DOCUMENT_TYPE_LABELS } from "./document-type-labels";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface TutorDetailProps {
  tutor: Tutor;
  patients: Patient[];
}

export function TutorDetail({ tutor, patients }: TutorDetailProps) {
  const fullName = `${tutor.firstName} ${tutor.lastName}`;
  const colors = getAvatarColors(tutor.id);
  const document = `${DOCUMENT_TYPE_LABELS[tutor.documentType]} ${tutor.documentNumber}`;

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.05fr_1fr]">
      <section className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
        <div className="mb-[18px] flex items-center gap-[13px]">
          <div
            className={`flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[14px] text-[15px] font-extrabold ${colors.tint} ${colors.ink}`}
          >
            {getInitials(fullName)}
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-extrabold tracking-[-0.01em]">{fullName}</div>
            <div className="text-[12.5px] text-neutral-600">
              Acudiente desde {formatDate(tutor.createdAt)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-[18px] gap-y-3.5 text-[13.5px]">
          <div>
            <div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-neutral-600">Documento</div>
            <span className="whitespace-nowrap">{document}</span>
          </div>
          <div>
            <div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-neutral-600">Teléfono</div>
            <span className="whitespace-nowrap">{tutor.phone}</span>
          </div>
          <div className="col-span-2 min-w-0">
            <div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-neutral-600">Correo</div>
            <span className="break-words">{tutor.email ?? "—"}</span>
          </div>
          <div>
            <div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-neutral-600">Ciudad</div>
            {tutor.city ?? "—"}
          </div>
          <div className="col-span-2">
            <div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-neutral-600">Dirección</div>
            {tutor.address ?? "—"}
          </div>
        </div>

        <div className="mt-[18px] flex items-center gap-2 rounded-[var(--radius-sm)] border border-brand-2-200 bg-brand-2-100 px-3 py-2.5 text-[12.5px] font-semibold text-brand-2-700">
          <ShieldCheck size={16} weight="duotone" />
          Autorización de tratamiento de datos firmada
          {tutor.dataConsentAt ? ` · ${formatDate(tutor.dataConsentAt)}` : ""}
        </div>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
        <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
          <span className="text-[14.5px] font-extrabold">Mascotas</span>
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11.5px] font-extrabold text-neutral-700">
            {patients.length}
          </span>
          <span className="min-w-0 flex-1" />
          {/*
            key={tutor.id} fuerza un remount cuando cambia el acudiente de la
            ficha abierta. Sin esto, react-hook-form conserva su estado
            interno entre selecciones distintas (`defaultValues` solo se
            evalúa al montar, no se resincroniza con la prop `tutorId`), y la
            mascota nueva quedaba vinculada al PRIMER acudiente que abrió el
            diálogo alguna vez, sin importar cuál ficha estuviera abierta.
          */}
          <PatientFormDialog key={tutor.id} tutorId={tutor.id} tutorName={fullName} tutorDocument={document} />
        </div>

        <div className="flex flex-col gap-2.5">
          {patients.map((patient) => {
            const SpeciesIcon = SPECIES_ICONS[patient.species];
            const petColors = getAvatarColors(patient.id);
            const meta = [
              SPECIES_LABELS[patient.species],
              patient.breedName ?? patient.breedOther,
              SEX_LABELS[patient.sex],
              patient.ageLabel,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <Link
                key={patient.id}
                href={`/pacientes/${patient.id}`}
                className="flex items-center gap-3 rounded-[13px] border border-border bg-muted/40 p-3 hover:bg-muted"
              >
                <span
                  className={`flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] text-[19px] ${petColors.tint} ${petColors.ink}`}
                >
                  <SpeciesIcon weight="duotone" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-bold">{patient.name}</span>
                  <span className="block text-[12.5px] text-neutral-600">{meta}</span>
                </span>
                <CaretRight size={15} className="flex-none text-neutral-400" />
              </Link>
            );
          })}

          {patients.length === 0 && (
            <div className="rounded-[13px] border border-dashed border-neutral-300 px-3 py-[22px] text-center text-[13px] text-neutral-500">
              Este acudiente aún no tiene mascotas registradas.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
