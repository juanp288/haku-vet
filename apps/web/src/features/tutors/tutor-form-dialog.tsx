"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "@phosphor-icons/react/dist/csr/UserPlus";
import { createTutorSchema, type CreateTutorInput } from "@vetclinic/contracts";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { getApiErrorDetails, getApiErrorMessage } from "@/lib/api-error";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_OPTIONS } from "./document-type-labels";
import { useCreateTutor } from "./use-tutors";

const DEFAULT_VALUES: CreateTutorInput = {
  documentType: "CC",
  documentNumber: "",
  firstName: "",
  lastName: "",
  phone: "",
  phoneAlt: "",
  email: "",
  address: "",
  city: "",
  notes: "",
  dataConsent: false,
};

function getExistingTutorId(error: unknown): string | null {
  const existingTutorId = getApiErrorDetails(error)?.["existingTutorId"];
  return typeof existingTutorId === "string" ? existingTutorId : null;
}

interface TutorFormDialogProps {
  onConflict: (existingTutorId: string) => void;
}

export function TutorFormDialog({ onConflict }: TutorFormDialogProps) {
  const [open, setOpen] = useState(false);
  const createTutor = useCreateTutor();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateTutorInput>({
    resolver: zodResolver(createTutorSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const closeAndReset = () => {
    setOpen(false);
    reset(DEFAULT_VALUES);
    createTutor.reset();
  };

  const onSubmit = (data: CreateTutorInput) => {
    createTutor.mutate(
      { body: data },
      {
        onSuccess: () => closeAndReset(),
        onError: (error) => {
          const existingId = getExistingTutorId(error);
          if (existingId) {
            closeAndReset();
            onConflict(existingId);
          }
        },
      },
    );
  };

  // El conflicto (409) ya cierra el diálogo y selecciona esa fila en la
  // tabla maestro-detalle — no lo repetimos como mensaje genérico acá.
  const apiErrorMessage = getExistingTutorId(createTutor.error)
    ? null
    : getApiErrorMessage(createTutor.error, "No se pudo guardar el acudiente. Intente de nuevo.");

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeAndReset())}>
      <DialogTrigger asChild>
        <Button type="button">+ Nuevo acudiente</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex-row items-start gap-3 space-y-0">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-brand-100 text-brand-700">
            <UserPlus size={20} weight="duotone" />
          </span>
          <div className="flex-1 text-left">
            <DialogTitle>Nuevo acudiente</DialogTitle>
            <DialogDescription>Documento y teléfono son obligatorios.</DialogDescription>
          </div>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="grid gap-3">
          <div className="grid grid-cols-[1fr_2fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ac-doctype">Tipo doc.</Label>
              <Controller
                name="documentType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="ac-doctype">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {DOCUMENT_TYPE_LABELS[option]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-docnum">Número de documento</Label>
              <Input
                id="ac-docnum"
                placeholder="1.020.304.050"
                {...register("documentNumber")}
              />
              {errors.documentNumber && (
                <p className="text-[13px] text-destructive">
                  {errors.documentNumber.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ac-first">Nombres</Label>
              <Input id="ac-first" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-[13px] text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-last">Apellidos</Label>
              <Input id="ac-last" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-[13px] text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ac-phone">Teléfono</Label>
              <Input id="ac-phone" placeholder="+57 300 000 0000" {...register("phone")} />
              {errors.phone && (
                <p className="text-[13px] text-destructive">{errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-email">Correo (opcional)</Label>
              <Input id="ac-email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-[13px] text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ac-addr">Dirección</Label>
            <Input id="ac-addr" {...register("address")} />
          </div>

          <div className="flex items-center gap-2">
            <Controller
              name="dataConsent"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="ac-consent"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              )}
            />
            <Label htmlFor="ac-consent" className="font-normal">
              Autoriza el tratamiento de sus datos personales (Habeas Data)
            </Label>
          </div>
          {errors.dataConsent && (
            <p className="text-[13px] text-destructive">{errors.dataConsent.message}</p>
          )}

          {apiErrorMessage && <p className="text-[13px] text-destructive">{apiErrorMessage}</p>}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={closeAndReset}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createTutor.isPending}>
              {createTutor.isPending ? "Guardando…" : "Guardar acudiente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
