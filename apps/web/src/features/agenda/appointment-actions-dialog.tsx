"use client";

import type { AgendaAppointment } from "@vetclinic/contracts";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorDetails, getApiErrorMessage } from "@/lib/api-error";
import { APPOINTMENT_STATUS_CLASSES, APPOINTMENT_STATUS_LABELS } from "./appointment-status-labels";
import { APPOINTMENT_VALID_TRANSITIONS, MOVABLE_APPOINTMENT_STATUSES } from "./appointment-transitions";
import { useChangeAppointmentStatus, useMoveAppointment } from "./use-appointments";

interface AppointmentActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AgendaAppointment;
}

export function AppointmentActionsDialog({
  open,
  onOpenChange,
  appointment,
}: AppointmentActionsDialogProps) {
  const [mode, setMode] = useState<"menu" | "cancelling" | "moving">("menu");
  const [cancelReason, setCancelReason] = useState("");
  const [moveDate, setMoveDate] = useState(appointment.startsAt.slice(0, 10));
  const [moveTime, setMoveTime] = useState(appointment.startTimeLabel);

  const changeStatus = useChangeAppointmentStatus();
  const moveAppointment = useMoveAppointment();

  const closeAndReset = () => {
    onOpenChange(false);
    setMode("menu");
    setCancelReason("");
    changeStatus.reset();
    moveAppointment.reset();
  };

  const nextStatuses = APPOINTMENT_VALID_TRANSITIONS[appointment.status].filter(
    (status) => status !== "CANCELADA",
  );
  const canCancel = APPOINTMENT_VALID_TRANSITIONS[appointment.status].includes("CANCELADA");
  const canMove = MOVABLE_APPOINTMENT_STATUSES.includes(appointment.status);

  const handleStatusChange = (status: AgendaAppointment["status"]) => {
    changeStatus.mutate(
      { params: { id: appointment.id }, body: { status } },
      { onSuccess: () => closeAndReset() },
    );
  };

  const handleCancel = () => {
    if (!cancelReason.trim()) {
      return;
    }
    changeStatus.mutate(
      { params: { id: appointment.id }, body: { status: "CANCELADA", cancelReason: cancelReason.trim() } },
      { onSuccess: () => closeAndReset() },
    );
  };

  const handleMove = () => {
    moveAppointment.mutate(
      { params: { id: appointment.id }, body: { date: moveDate, time: moveTime } },
      { onSuccess: () => closeAndReset() },
    );
  };

  const moveConflict = getApiErrorDetails(moveAppointment.error)?.["conflictingAppointment"] as
    | AgendaAppointment
    | undefined;
  const statusErrorMessage = getApiErrorMessage(
    changeStatus.error,
    "No se pudo actualizar la cita. Intente de nuevo.",
  );
  const moveErrorMessage = moveConflict
    ? null
    : getApiErrorMessage(moveAppointment.error, "No se pudo mover la cita. Intente de nuevo.");

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : closeAndReset())}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex-row items-start gap-3 space-y-0">
          <div className="flex-1 text-left">
            <DialogTitle>{appointment.patientName}</DialogTitle>
            <DialogDescription>
              {appointment.tutorName} · {appointment.reason}
            </DialogDescription>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${APPOINTMENT_STATUS_CLASSES[appointment.status]}`}
          >
            {APPOINTMENT_STATUS_LABELS[appointment.status]}
          </span>
        </DialogHeader>

        {mode === "menu" && (
          <div className="grid gap-3">
            <p className="text-[13px] text-neutral-600">
              {appointment.startTimeLabel} · {appointment.type}
            </p>

            {nextStatuses.length === 0 && !canCancel && !canMove && (
              <p className="text-[13px] text-neutral-500">
                Esta cita está en un estado final: no admite más cambios.
              </p>
            )}

            {nextStatuses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((status) => (
                  <Button
                    key={status}
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={changeStatus.isPending}
                    onClick={() => handleStatusChange(status)}
                  >
                    Marcar {APPOINTMENT_STATUS_LABELS[status].toLowerCase()}
                  </Button>
                ))}
              </div>
            )}

            {canMove && (
              <Button type="button" variant="outline" size="sm" onClick={() => setMode("moving")}>
                Mover a otro horario
              </Button>
            )}

            {canCancel && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setMode("cancelling")}
              >
                Cancelar cita
              </Button>
            )}

            {statusErrorMessage && <p className="text-[13px] text-destructive">{statusErrorMessage}</p>}
          </div>
        )}

        {mode === "cancelling" && (
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cancel-reason">Motivo de la cancelación</Label>
              <Input
                id="cancel-reason"
                placeholder="Ej. El tutor no puede asistir"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
              />
            </div>
            {statusErrorMessage && <p className="text-[13px] text-destructive">{statusErrorMessage}</p>}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setMode("menu")}>
                Volver
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!cancelReason.trim() || changeStatus.isPending}
                onClick={handleCancel}
              >
                {changeStatus.isPending ? "Cancelando…" : "Confirmar cancelación"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {mode === "moving" && (
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="move-date">Fecha</Label>
                <Input
                  id="move-date"
                  type="date"
                  value={moveDate}
                  onChange={(event) => setMoveDate(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="move-time">Hora</Label>
                <Input
                  id="move-time"
                  type="time"
                  value={moveTime}
                  onChange={(event) => setMoveTime(event.target.value)}
                />
              </div>
            </div>
            {moveConflict && (
              <p className="text-[13px] text-destructive">
                El veterinario ya tiene a <strong>{moveConflict.patientName}</strong> agendado a las{" "}
                {moveConflict.startTimeLabel}. Elija otra franja.
              </p>
            )}
            {moveErrorMessage && <p className="text-[13px] text-destructive">{moveErrorMessage}</p>}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setMode("menu")}>
                Volver
              </Button>
              <Button type="button" disabled={moveAppointment.isPending} onClick={handleMove}>
                {moveAppointment.isPending ? "Guardando…" : "Guardar nuevo horario"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
