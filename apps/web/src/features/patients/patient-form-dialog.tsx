"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createPatientSchema, type CreatePatientInput } from "@vetclinic/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { getApiErrorDetails, getApiErrorMessage } from "@/lib/api-error";
import { SPECIES_LABELS, SPECIES_OPTIONS } from "@/lib/species-labels";
import { SEX_LABELS, SEX_OPTIONS } from "./sex-labels";
import { useBreeds } from "./use-breeds";
import { useCreatePatient } from "./use-patients";

/** No es un id real de raza — marca "quiero escribir una raza libre" en el select. */
const OTHER_BREED_VALUE = "__OTRA__";

function buildDefaultValues(tutorId: string): CreatePatientInput {
  return {
    name: "",
    species: "CANINO",
    speciesOther: "",
    breedId: "",
    breedOther: "",
    sex: "DESCONOCIDO",
    isNeutered: false,
    birthDate: "",
    birthDateIsApprox: false,
    color: "",
    microchip: "",
    tutorId,
    tutorRelationship: "",
  };
}

function getExistingPatientId(error: unknown): string | null {
  const existingPatientId = getApiErrorDetails(error)?.["existingPatientId"];
  return typeof existingPatientId === "string" ? existingPatientId : null;
}

interface PatientFormDialogProps {
  tutorId: string;
  tutorName: string;
}

export function PatientFormDialog({ tutorId, tutorName }: PatientFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [breedMode, setBreedMode] = useState<"catalog" | "otra">("catalog");
  const createPatient = useCreatePatient();
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreatePatientInput>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: buildDefaultValues(tutorId),
  });

  const species = watch("species");
  const breedId = watch("breedId");
  const { data: breedsData } = useBreeds(species);
  const breeds = breedsData?.body ?? [];

  const closeAndReset = () => {
    setOpen(false);
    setBreedMode("catalog");
    reset(buildDefaultValues(tutorId));
    createPatient.reset();
  };

  const onSubmit = (data: CreatePatientInput) => {
    createPatient.mutate(
      { body: data },
      {
        onSuccess: (result) => {
          closeAndReset();
          router.push(`/pacientes/${result.body.id}`);
        },
      },
    );
  };

  const existingPatientId = getExistingPatientId(createPatient.error);
  const apiErrorMessage = existingPatientId
    ? null
    : getApiErrorMessage(
        createPatient.error,
        "No se pudo registrar la mascota. Intente de nuevo.",
      );

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeAndReset())}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm">
          + Mascota
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva mascota</DialogTitle>
        </DialogHeader>
        <p className="-mt-2 text-[13px] opacity-70">Acudiente: {tutorName}</p>
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pt-name">Nombre</Label>
            <Input id="pt-name" {...register("name")} />
            {errors.name && <p className="text-[13px] text-brand-2-700">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pt-species">Especie</Label>
              <Controller
                name="species"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setValue("breedId", "");
                      setValue("breedOther", "");
                      setBreedMode("catalog");
                    }}
                  >
                    <SelectTrigger id="pt-species">
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
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-sex">Sexo</Label>
              <Controller
                name="sex"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="pt-sex">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEX_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {SEX_LABELS[option]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {species === "OTRO" && (
            <div className="space-y-1.5">
              <Label htmlFor="pt-species-other">Cuál especie</Label>
              <Input id="pt-species-other" {...register("speciesOther")} />
              {errors.speciesOther && (
                <p className="text-[13px] text-brand-2-700">{errors.speciesOther.message}</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="pt-breed">Raza (opcional)</Label>
            <Select
              value={breedMode === "otra" ? OTHER_BREED_VALUE : breedId}
              onValueChange={(value) => {
                if (value === OTHER_BREED_VALUE) {
                  setBreedMode("otra");
                  setValue("breedId", "");
                } else {
                  setBreedMode("catalog");
                  setValue("breedId", value);
                  setValue("breedOther", "");
                }
              }}
            >
              <SelectTrigger id="pt-breed">
                <SelectValue placeholder="Sin especificar" />
              </SelectTrigger>
              <SelectContent>
                {breeds.map((breed) => (
                  <SelectItem key={breed.id} value={breed.id}>
                    {breed.name}
                  </SelectItem>
                ))}
                <SelectItem value={OTHER_BREED_VALUE}>Otra (especificar)</SelectItem>
              </SelectContent>
            </Select>
            {breedMode === "otra" && (
              <Input placeholder="Escriba la raza" className="mt-1.5" {...register("breedOther")} />
            )}
            {errors.breedOther && (
              <p className="text-[13px] text-brand-2-700">{errors.breedOther.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pt-birthdate">Fecha de nacimiento (opcional)</Label>
              <Input id="pt-birthdate" type="date" {...register("birthDate")} />
              {errors.birthDate && (
                <p className="text-[13px] text-brand-2-700">{errors.birthDate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-color">Color (opcional)</Label>
              <Input id="pt-color" {...register("color")} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Controller
              name="birthDateIsApprox"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="pt-approx"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              )}
            />
            <Label htmlFor="pt-approx" className="font-normal">
              La fecha de nacimiento es aproximada
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Controller
              name="isNeutered"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="pt-neutered"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              )}
            />
            <Label htmlFor="pt-neutered" className="font-normal">
              Esterilizado
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pt-microchip">Microchip (opcional)</Label>
            <Input id="pt-microchip" {...register("microchip")} />
            {existingPatientId && (
              <p className="text-[13px] text-brand-2-700">
                Ya existe una mascota registrada con este microchip.{" "}
                <Link href={`/pacientes/${existingPatientId}`} className="underline">
                  Ver mascota
                </Link>
                .
              </p>
            )}
          </div>

          {apiErrorMessage && <p className="text-[13px] text-brand-2-700">{apiErrorMessage}</p>}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={closeAndReset}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createPatient.isPending}>
              {createPatient.isPending ? "Guardando…" : "Guardar mascota"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
