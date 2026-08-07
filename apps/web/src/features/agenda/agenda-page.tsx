"use client";

import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import type { AgendaAppointment, AgendaVetColumn } from "@vetclinic/contracts";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SPECIES_ICONS } from "@/features/patients/species-icons";
import { addDays, buildSlotLabels, formatDateLabel, isInSlot, isOutsideHours } from "./agenda-utils";
import { APPOINTMENT_STATUS_CLASSES, APPOINTMENT_STATUS_LABELS } from "./appointment-status-labels";
import { NewAppointmentDialog } from "./new-appointment-dialog";
import { useAgenda } from "./use-agenda";

function AppointmentCard({ appointment }: { appointment: AgendaAppointment }) {
  const SpeciesIcon = SPECIES_ICONS[appointment.patientSpecies];
  return (
    <Link
      href={`/pacientes/${appointment.patientId}`}
      className="block rounded-[12px] border border-border bg-card p-2.5 text-left hover:border-neutral-400"
    >
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-extrabold tracking-[0.01em] text-neutral-700">
          {appointment.startTimeLabel}
        </span>
        <span className="flex-1" />
        <span
          className={`rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${APPOINTMENT_STATUS_CLASSES[appointment.status]}`}
        >
          {APPOINTMENT_STATUS_LABELS[appointment.status]}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[15px] font-bold">
        <SpeciesIcon size={15} weight="duotone" className="text-neutral-500" />
        {appointment.patientName}
      </div>
      <div className="mt-0.5 truncate text-[12.5px] text-neutral-600">
        {appointment.tutorName} · {appointment.reason}
      </div>
    </Link>
  );
}

function VetColumn({
  column,
  slots,
  openingHour,
  closingHour,
  slotMinutes,
  onSlotClick,
}: {
  column: AgendaVetColumn;
  slots: string[];
  openingHour: number;
  closingHour: number;
  slotMinutes: number;
  onSlotClick: (vetId: string, time: string) => void;
}) {
  const outsideHours = column.appointments.filter((appointment) =>
    isOutsideHours(appointment.startTimeLabel, openingHour, closingHour),
  );

  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-card p-3.5">
      <div className="mb-3 flex items-center gap-2.5 border-b border-border pb-3">
        <span
          className="h-[9px] w-[9px] flex-none rounded-full"
          style={{ background: column.color ?? "var(--color-accent)" }}
        />
        <span className="text-[14.5px] font-bold">{column.vetName}</span>
        <span className="flex-1" />
        <span className="text-[11.5px] font-bold text-neutral-500">
          {column.appointments.length} cita{column.appointments.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-col gap-[7px]">
        {slots.map((slot) => {
          const appointment = column.appointments.find((a) => isInSlot(a.startTimeLabel, slot, slotMinutes));
          if (appointment) {
            return <AppointmentCard key={slot} appointment={appointment} />;
          }
          return (
            <button
              key={slot}
              type="button"
              onClick={() => onSlotClick(column.vetId, slot)}
              className="flex items-center gap-2 rounded-[11px] border border-dashed border-neutral-300 px-3 py-2 text-left text-[12.5px] text-neutral-400 hover:border-brand-300 hover:text-brand-700"
            >
              <span className="font-extrabold">{slot}</span>
              <span>Disponible</span>
            </button>
          );
        })}

        {outsideHours.length > 0 && (
          <div className="mt-1.5 border-t border-border pt-2.5">
            <div className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.09em] text-neutral-500">
              Fuera de horario
            </div>
            <div className="flex flex-col gap-[7px]">
              {outsideHours.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function AgendaPage() {
  const [date, setDate] = useState<string | undefined>(undefined);
  const { data, isLoading } = useAgenda(date);
  const agenda = data?.body;

  const [slotDialog, setSlotDialog] = useState<{ vetId: string; time: string } | null>(null);

  const slots = agenda ? buildSlotLabels(agenda.openingHour, agenda.closingHour, agenda.slotMinutes) : [];

  return (
    <div className="px-6 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px]">Agenda del día</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {agenda
              ? `${formatDateLabel(agenda.date)} · ${agenda.vets.reduce((sum, v) => sum + v.appointments.length, 0)} citas programadas`
              : "Cargando…"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-[11px] border border-border bg-card p-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Día anterior"
            disabled={!agenda}
            onClick={() => agenda && setDate(addDays(agenda.date, -1))}
          >
            <CaretLeft size={16} weight="bold" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setDate(undefined)}>
            Hoy
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Día siguiente"
            disabled={!agenda}
            onClick={() => agenda && setDate(addDays(agenda.date, 1))}
          >
            <CaretRight size={16} weight="bold" />
          </Button>
        </div>
      </div>

      {isLoading || !agenda ? (
        <p className="text-sm opacity-70">Cargando…</p>
      ) : (
        <>
          {!agenda.isWorkingDay && (
            <div className="mb-4 rounded-[12px] border border-warning-100 bg-warning-100 px-3.5 py-2.5 text-[13px] text-warning-700">
              Este día no está configurado como laboral en la clínica.
            </div>
          )}

          {agenda.vets.length === 0 ? (
            <p className="text-sm opacity-70">No hay veterinarios activos registrados.</p>
          ) : (
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {agenda.vets.map((column) => (
                <VetColumn
                  key={column.vetId}
                  column={column}
                  slots={slots}
                  openingHour={agenda.openingHour}
                  closingHour={agenda.closingHour}
                  slotMinutes={agenda.slotMinutes}
                  onSlotClick={(vetId, time) => setSlotDialog({ vetId, time })}
                />
              ))}
            </div>
          )}

          {slotDialog && (
            <NewAppointmentDialog
              key={`${slotDialog.vetId}-${slotDialog.time}`}
              open
              onOpenChange={(next) => {
                if (!next) {
                  setSlotDialog(null);
                }
              }}
              date={agenda.date}
              vets={agenda.vets.map((v) => ({ vetId: v.vetId, vetName: v.vetName }))}
              defaultVetId={slotDialog.vetId}
              defaultTime={slotDialog.time}
              defaultDurationMinutes={agenda.slotMinutes}
            />
          )}
        </>
      )}
    </div>
  );
}
