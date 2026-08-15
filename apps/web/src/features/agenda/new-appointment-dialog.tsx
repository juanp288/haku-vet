"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus } from "@phosphor-icons/react/dist/csr/CalendarPlus";
import {
  createAppointmentSchema,
  type AgendaAppointment,
  type CreateAppointmentInput,
  type Species,
} from "@vetclinic/contracts";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreatePatient } from "@/features/patients/use-patients";
import { useSearch } from "@/features/search/use-search";
import { useTutors } from "@/features/tutors/use-tutors";
import { getApiErrorDetails, getApiErrorMessage } from "@/lib/api-error";
import { SPECIES_LABELS, SPECIES_OPTIONS } from "@/lib/species-labels";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useCreateAppointment } from "./use-appointments";

interface SelectedPatient {
  id: string;
  name: string;
  tutorName: string;
}

/** D2/UX: lo que la grilla de fondo necesita para "adivinar" qué franjas va a ocupar esta cita todavía sin guardar. */
export interface PendingAppointmentPreview {
  date: string;
  vetId: string;
  time: string;
  durationMinutes: number;
}

interface NewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  vets: { vetId: string; vetName: string }[];
  defaultVetId: string;
  defaultTime: string;
  defaultDurationMinutes: number;
  onPreviewChange?: (preview: PendingAppointmentPreview | null) => void;
}

function buildDefaultValues(
  date: string,
  vetId: string,
  time: string,
  durationMinutes: number,
): CreateAppointmentInput {
  return {
    patientId: "",
    vetId,
    date,
    time,
    durationMinutes,
    type: "CONSULTA",
    reason: "",
    notes: "",
  };
}

export function NewAppointmentDialog({
  open,
  onOpenChange,
  date,
  vets,
  defaultVetId,
  defaultTime,
  defaultDurationMinutes,
  onPreviewChange,
}: NewAppointmentDialogProps) {
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [newPatientSpecies, setNewPatientSpecies] = useState<Species>("CANINO");
  const [newPatientTutorId, setNewPatientTutorId] = useState("");

  const debouncedQuery = useDebouncedValue(patientQuery, 250).trim();
  const { data: searchData, isFetching: isSearching } = useSearch(debouncedQuery);
  const searchResults = searchData?.body ?? [];
  const { data: tutorsData } = useTutors();
  const tutors = tutorsData?.body ?? [];

  const createAppointment = useCreateAppointment();
  const createPatient = useCreatePatient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateAppointmentInput>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: buildDefaultValues(date, defaultVetId, defaultTime, defaultDurationMinutes),
  });

  const watchedDate = watch("date");
  const watchedVetId = watch("vetId");
  const watchedTime = watch("time");
  const watchedDurationMinutes = watch("durationMinutes");

  // Le avisa a la grilla de fondo (AgendaPage) qué franja está a punto de
  // ocupar esta cita todavía sin guardar, para que se vea coherente con lo
  // que se está seleccionando acá — sin esto, un slot vacío que en realidad
  // va a quedar cubierto por la duración elegida seguía viéndose "Disponible".
  useEffect(() => {
    if (!open) {
      return;
    }
    onPreviewChange?.({
      date: watchedDate,
      vetId: watchedVetId,
      time: watchedTime,
      durationMinutes: watchedDurationMinutes,
    });
    return () => onPreviewChange?.(null);
  }, [open, watchedDate, watchedVetId, watchedTime, watchedDurationMinutes, onPreviewChange]);

  const closeAndReset = () => {
    onOpenChange(false);
    reset(buildDefaultValues(date, defaultVetId, defaultTime, defaultDurationMinutes));
    setSelectedPatient(null);
    setPatientQuery("");
    setCreatingPatient(false);
    setNewPatientSpecies("CANINO");
    setNewPatientTutorId("");
    createAppointment.reset();
    createPatient.reset();
  };

  const selectPatient = (patient: SelectedPatient) => {
    setSelectedPatient(patient);
    setValue("patientId", patient.id);
    setPatientQuery("");
  };

  const handleCreatePatientInline = () => {
    if (!newPatientTutorId) {
      return;
    }
    createPatient.mutate(
      {
        body: {
          name: patientQuery.trim(),
          species: newPatientSpecies,
          sex: "DESCONOCIDO",
          isNeutered: false,
          birthDateIsApprox: false,
          tutorId: newPatientTutorId,
        },
      },
      {
        onSuccess: (result) => {
          const tutor = tutors.find((t) => t.id === newPatientTutorId);
          selectPatient({
            id: result.body.id,
            name: result.body.name,
            tutorName: tutor ? `${tutor.firstName} ${tutor.lastName}` : "",
          });
          setCreatingPatient(false);
        },
      },
    );
  };

  const onSubmit = (data: CreateAppointmentInput) => {
    if (!selectedPatient) {
      return;
    }
    createAppointment.mutate(
      { body: { ...data, patientId: selectedPatient.id } },
      { onSuccess: () => closeAndReset() },
    );
  };

  const conflict = getApiErrorDetails(createAppointment.error)?.["conflictingAppointment"] as
    | AgendaAppointment
    | undefined;
  const apiErrorMessage = conflict
    ? null
    : getApiErrorMessage(createAppointment.error, "No se pudo agendar la cita. Intente de nuevo.");
  const createPatientErrorMessage = getApiErrorMessage(
    createPatient.error,
    "No se pudo crear la mascota. Intente de nuevo.",
  );

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : closeAndReset())}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex-row items-start gap-3 space-y-0">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-brand-100 text-brand-700">
            <CalendarPlus size={20} weight="duotone" />
          </span>
          <div className="flex-1 text-left">
            <DialogTitle>Nueva cita</DialogTitle>
            <DialogDescription>Se valida disponibilidad del veterinario al guardar.</DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="na-patient">Mascota</Label>

            {selectedPatient ? (
              <div className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-border bg-muted/60 px-3 py-2.5">
                <span className="text-[13.5px] font-bold">{selectedPatient.name}</span>
                {selectedPatient.tutorName && (
                  <span className="text-[12px] text-neutral-600">{selectedPatient.tutorName}</span>
                )}
                <span className="flex-1" />
                <button
                  type="button"
                  className="text-[12.5px] font-bold text-brand-700 hover:underline"
                  onClick={() => {
                    setSelectedPatient(null);
                    setValue("patientId", "");
                  }}
                >
                  Cambiar
                </button>
              </div>
            ) : creatingPatient ? (
              <div className="rounded-[var(--radius-sm)] border border-border bg-muted/40 p-3">
                <p className="mb-2 text-[13px]">
                  Nueva mascota: <strong>{patientQuery.trim()}</strong>
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="na-new-tutor">Acudiente</Label>
                    <Select value={newPatientTutorId} onValueChange={setNewPatientTutorId}>
                      <SelectTrigger id="na-new-tutor">
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        {tutors.map((tutor) => (
                          <SelectItem key={tutor.id} value={tutor.id}>
                            {tutor.firstName} {tutor.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="na-new-species">Especie</Label>
                    <Select
                      value={newPatientSpecies}
                      onValueChange={(value) => setNewPatientSpecies(value as Species)}
                    >
                      <SelectTrigger id="na-new-species">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPECIES_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {SPECIES_LABELS[option]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {createPatientErrorMessage && (
                  <p className="mt-2 text-[13px] text-destructive">{createPatientErrorMessage}</p>
                )}
                <div className="mt-2.5 flex justify-end gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setCreatingPatient(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="positive"
                    size="sm"
                    disabled={!newPatientTutorId || createPatient.isPending}
                    onClick={handleCreatePatientInline}
                  >
                    {createPatient.isPending ? "Creando…" : "Crear y usar esta mascota"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Input
                  id="na-patient"
                  placeholder="Buscar mascota, acudiente, teléfono o documento…"
                  value={patientQuery}
                  onChange={(event) => setPatientQuery(event.target.value)}
                />
                {debouncedQuery && (
                  <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 max-h-[220px] overflow-y-auto rounded-[var(--radius-md)] border border-border bg-card p-1.5 shadow-[0_4px_12px_rgba(14,27,42,.08)]">
                    {isSearching ? (
                      <p className="px-2.5 py-2 text-[13px] opacity-70">Buscando…</p>
                    ) : searchResults.length === 0 ? (
                      <button
                        type="button"
                        className="w-full rounded-[9px] px-2.5 py-2 text-left text-[13px] text-brand-700 hover:bg-muted"
                        onClick={() => setCreatingPatient(true)}
                      >
                        + Crear &quot;{debouncedQuery}&quot; como mascota nueva
                      </button>
                    ) : (
                      searchResults.map((result) => (
                        <button
                          key={result.patientId}
                          type="button"
                          className="flex w-full items-center justify-between gap-2 rounded-[9px] px-2.5 py-2 text-left text-[13px] hover:bg-muted"
                          onClick={() =>
                            selectPatient({
                              id: result.patientId,
                              name: result.patientName,
                              tutorName: result.primaryTutorName,
                            })
                          }
                        >
                          <span className="font-bold">{result.patientName}</span>
                          <span className="text-neutral-600">{result.primaryTutorName}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            {errors.patientId && (
              <p className="text-[13px] text-destructive">{errors.patientId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="na-vet">Veterinario</Label>
              <Controller
                name="vetId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="na-vet">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {vets.map((vet) => (
                        <SelectItem key={vet.vetId} value={vet.vetId}>
                          {vet.vetName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="na-type">Tipo</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="na-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONSULTA">Consulta</SelectItem>
                      <SelectItem value="VACUNACION">Vacunación</SelectItem>
                      <SelectItem value="CONTROL">Control</SelectItem>
                      <SelectItem value="PROCEDIMIENTO">Procedimiento</SelectItem>
                      <SelectItem value="URGENCIA">Urgencia</SelectItem>
                      <SelectItem value="OTRO">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="na-date">Fecha</Label>
              <Input id="na-date" type="date" {...register("date")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="na-time">Hora</Label>
              <Input id="na-time" type="time" {...register("time")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="na-duration">Duración (min)</Label>
              <Input
                id="na-duration"
                type="number"
                step={5}
                {...register("durationMinutes", { valueAsNumber: true })}
              />
            </div>
          </div>
          {(errors.date || errors.time || errors.durationMinutes) && (
            <p className="text-[13px] text-destructive">
              {errors.date?.message || errors.time?.message || errors.durationMinutes?.message}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="na-reason">Motivo</Label>
            <Input id="na-reason" placeholder="Ej. Control de vacunación" {...register("reason")} />
            {errors.reason && <p className="text-[13px] text-destructive">{errors.reason.message}</p>}
          </div>

          {conflict && (
            <p className="text-[13px] text-destructive">
              El veterinario ya tiene a <strong>{conflict.patientName}</strong> agendado a las{" "}
              {conflict.startTimeLabel}. Elija otra franja.
            </p>
          )}
          {apiErrorMessage && <p className="text-[13px] text-destructive">{apiErrorMessage}</p>}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={closeAndReset}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!selectedPatient || createAppointment.isPending}>
              {createAppointment.isPending ? "Agendando…" : "Agendar cita"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
