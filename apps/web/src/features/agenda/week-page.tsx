"use client";

import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import type { AgendaAppointment, WeekDay } from "@vetclinic/contracts";
import Link from "next/link";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { addDays, formatShortDateLabel } from "./agenda-utils";
import { APPOINTMENT_STATUS_CLASSES } from "./appointment-status-labels";
import { useAgendaWeek } from "./use-agenda-week";

function AppointmentChip({ appointment }: { appointment: AgendaAppointment }) {
  return (
    <Link
      href={`/pacientes/${appointment.patientId}`}
      className={`block truncate rounded-[8px] px-1.5 py-1 text-[11px] font-bold hover:opacity-80 ${APPOINTMENT_STATUS_CLASSES[appointment.status]}`}
      title={`${appointment.startTimeLabel} · ${appointment.patientName} · ${appointment.tutorName}`}
    >
      {appointment.startTimeLabel} {appointment.patientName}
    </Link>
  );
}

function DayCell({ day, vetId }: { day: WeekDay; vetId: string }) {
  const appointments = day.vets.find((v) => v.vetId === vetId)?.appointments ?? [];

  return (
    <div className={`min-h-[64px] rounded-[10px] border border-border p-1.5 ${day.isWorkingDay ? "bg-card" : "bg-muted/50"}`}>
      {appointments.length === 0 ? (
        <span className="text-[11px] text-neutral-400">—</span>
      ) : (
        <div className="flex flex-col gap-1">
          {appointments.map((appointment) => (
            <AppointmentChip key={appointment.id} appointment={appointment} />
          ))}
        </div>
      )}
    </div>
  );
}

export function WeekPage() {
  const [date, setDate] = useState<string | undefined>(undefined);
  const { data, isLoading } = useAgendaWeek(date);
  const week = data?.body;

  const totalAppointments =
    week?.days.reduce((sum, day) => sum + day.vets.reduce((s, v) => s + v.appointments.length, 0), 0) ?? 0;

  return (
    <div className="px-6 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px]">Vista semanal</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {week
              ? `${formatShortDateLabel(week.weekStart)} – ${formatShortDateLabel(week.weekEnd)} · ${totalAppointments} citas programadas`
              : "Cargando…"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-[11px] border border-border bg-card p-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Semana anterior"
            disabled={!week}
            onClick={() => week && setDate(addDays(week.weekStart, -7))}
          >
            <CaretLeft size={16} weight="bold" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setDate(undefined)}>
            Esta semana
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Semana siguiente"
            disabled={!week}
            onClick={() => week && setDate(addDays(week.weekStart, 7))}
          >
            <CaretRight size={16} weight="bold" />
          </Button>
        </div>
      </div>

      {isLoading || !week ? (
        <p className="text-sm opacity-70">Cargando…</p>
      ) : week.days[0] && week.days[0].vets.length === 0 ? (
        <p className="text-sm opacity-70">No hay veterinarios activos registrados.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[900px] grid-cols-[160px_repeat(7,minmax(0,1fr))] gap-2">
            <div />
            {week.days.map((day) => (
              <div key={day.date} className="text-center">
                <div className={`text-[12.5px] font-extrabold ${day.isWorkingDay ? "text-neutral-700" : "text-neutral-400"}`}>
                  {formatShortDateLabel(day.date)}
                </div>
                {!day.isWorkingDay && <div className="text-[10.5px] text-neutral-400">No laboral</div>}
              </div>
            ))}

            {week.days[0]?.vets.map((vetColumn) => (
              <Fragment key={vetColumn.vetId}>
                <div className="flex items-center gap-2 py-1.5">
                  <span
                    className="h-[9px] w-[9px] flex-none rounded-full"
                    style={{ background: vetColumn.color ?? "var(--color-accent)" }}
                  />
                  <span className="truncate text-[13.5px] font-bold">{vetColumn.vetName}</span>
                </div>
                {week.days.map((day) => (
                  <DayCell key={`${vetColumn.vetId}-${day.date}`} day={day} vetId={vetColumn.vetId} />
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
