"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { linkTutorSchema, type LinkTutorInput } from "@vetclinic/contracts";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useTutors } from "@/features/tutors/use-tutors";
import { getApiErrorMessage } from "@/lib/api-error";
import { useLinkTutor } from "./use-patients";

const DEFAULT_VALUES: LinkTutorInput = {
  tutorId: "",
  relationship: "",
  isPrimary: false,
};

interface LinkTutorDialogProps {
  patientId: string;
  linkedTutorIds: string[];
}

export function LinkTutorDialog({ patientId, linkedTutorIds }: LinkTutorDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: tutorsData } = useTutors();
  const linkTutor = useLinkTutor(patientId);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<LinkTutorInput>({
    resolver: zodResolver(linkTutorSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const availableTutors = (tutorsData?.body ?? []).filter(
    (tutor) => !linkedTutorIds.includes(tutor.id),
  );

  const closeAndReset = () => {
    setOpen(false);
    reset(DEFAULT_VALUES);
    linkTutor.reset();
  };

  const onSubmit = (data: LinkTutorInput) => {
    linkTutor.mutate(
      { params: { id: patientId }, body: data },
      { onSuccess: () => closeAndReset() },
    );
  };

  const apiErrorMessage = getApiErrorMessage(
    linkTutor.error,
    "No se pudo vincular al acudiente. Intente de nuevo.",
  );

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeAndReset())}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          + Vincular acudiente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular acudiente</DialogTitle>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="lt-tutor">Acudiente</Label>
            <Controller
              name="tutorId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="lt-tutor">
                    <SelectValue placeholder="Seleccione un acudiente" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTutors.map((tutor) => (
                      <SelectItem key={tutor.id} value={tutor.id}>
                        {tutor.firstName} {tutor.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tutorId && (
              <p className="text-[13px] text-brand-2-700">{errors.tutorId.message}</p>
            )}
            {availableTutors.length === 0 && (
              <p className="text-[13px] opacity-70">
                Todos los acudientes registrados ya están vinculados a esta mascota.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lt-relationship">Relación (opcional)</Label>
            <Input
              id="lt-relationship"
              placeholder="Cuidador, familiar…"
              {...register("relationship")}
            />
          </div>

          <div className="flex items-center gap-2">
            <Controller
              name="isPrimary"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="lt-primary"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              )}
            />
            <Label htmlFor="lt-primary" className="font-normal">
              Marcar como acudiente principal
            </Label>
          </div>

          {apiErrorMessage && <p className="text-[13px] text-brand-2-700">{apiErrorMessage}</p>}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={closeAndReset}>
              Cancelar
            </Button>
            <Button type="submit" disabled={linkTutor.isPending || availableTutors.length === 0}>
              {linkTutor.isPending ? "Vinculando…" : "Vincular"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
