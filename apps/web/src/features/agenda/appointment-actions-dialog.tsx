"use client";

import type { AgendaAppointment, AppointmentStatus } from "@vetclinic/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useCurrentUser } from "@/features/auth/use-auth";
import { useCreateConsultation } from "@/features/consultations/use-consultations";
import { getApiErrorDetails, getApiErrorMessage } from "@/lib/api-error";
import { APPOINTMENT_STATUS_CLASSES, APPOINTMENT_STATUS_LABELS } from "./appointment-status-labels";
import { APPOINTMENT_VALID_TRANSITIONS, MOVABLE_APPOINTMENT_STATUSES } from "./appointment-transitions";
import { useChangeAppointmentStatus, useMoveAppointment } from "./use-appointments";

/** D1: "desde una cita en EN_SALA o EN_ATENCION, un botón crea la consulta". */
const CONSULTATION_CREATABLE_STATUSES: AppointmentStatus[] = ["EN_SALA", "EN_ATENCION"];

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
  const createConsultation = useCreateConsultation();
  const { data: currentUser } = useCurrentUser();
  const router = useRouter();

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
  const canCreateConsultation =
    !appointment.consultationId &&
    CONSULTATION_CREATABLE_STATUSES.includes(appointment.status) &&
    (currentUser?.body.role === "VETERINARIO" || currentUser?.body.role === "ADMIN");
  /** D2: RECEPCION nunca ve la historia clínica (RN-18) — no le ofrecemos un link que siempre le daría 403. */
  const canViewConsultation = Boolean(appointment.consultationId) && currentUser?.body.role !== "RECEPCION";

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

  const handleCreateConsultation = () => {
    createConsultation.mutate(
      { body: { appointmentId: appointment.id, reason: appointment.reason } },
      {
        onSuccess: (result) => {
          onOpenChange(false);
          router.push(`/consultas/${result.body.id}`);
        },
      },
    );
  };

  const createConsultationErrorMessage = getApiErrorMessage(
    createConsultation.error,
    "No se pudo crear la consulta. Intente de nuevo.",
  );

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

            {canCreateConsultation && (
              <Button
                type="button"
                variant="positive"
                size="sm"
                disabled={createConsultation.isPending}
                onClick={handleCreateConsultation}
              >
                {createConsultation.isPending ? "Creando…" : "Crear consulta"}
              </Button>
            )}
            {createConsultationErrorMessage && (
              <p className="text-[13px] text-destructive">{createConsultationErrorMessage}</p>
            )}

            {canViewConsultation && appointment.consultationId && (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href={`/consultas/${appointment.consultationId}`}>Ver consulta</Link>
              </Button>
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
