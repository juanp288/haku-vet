"use client";

import { Stethoscope } from "@phosphor-icons/react/dist/csr/Stethoscope";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/features/auth/use-auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { useCreateConsultation } from "./use-consultations";

interface NewConsultationDialogProps {
  patientId: string;
}

/**
 * D1: "también puedo crear una consulta sin cita previa (urgencia)". El
 * actor de la historia es VETERINARIO — el veterinario es siempre quien
 * inicia sesión aquí, así que `vetId` es el usuario actual sin selector. No
 * hay un endpoint para listar veterinarios activos fuera del contexto de
 * agenda, así que este botón no se ofrece a ADMIN (que necesitaría elegir
 * a nombre de quién crea la consulta) — eso queda para una sesión aparte
 * si hace falta.
 */
export function NewConsultationDialog({ patientId }: NewConsultationDialogProps) {
  const { data: currentUser } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();
  const createConsultation = useCreateConsultation();

  if (currentUser?.body.role !== "VETERINARIO") {
    return null;
  }

  const closeAndReset = () => {
    setOpen(false);
    setReason("");
    createConsultation.reset();
  };

  const handleSubmit = () => {
    if (!reason.trim()) {
      return;
    }
    createConsultation.mutate(
      { body: { patientId, vetId: currentUser.body.id, reason: reason.trim() } },
      {
        onSuccess: (result) => {
          closeAndReset();
          router.push(`/consultas/${result.body.id}`);
        },
      },
    );
  };

  const errorMessage = getApiErrorMessage(
    createConsultation.error,
    "No se pudo crear la consulta. Intente de nuevo.",
  );

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeAndReset())}>
      <DialogTrigger asChild>
        <Button type="button" variant="positive" size="sm">
          <Stethoscope size={16} weight="bold" />
          Nueva consulta (urgencia)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex-row items-start gap-3 space-y-0">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-brand-2-100 text-brand-2-700">
            <Stethoscope size={20} weight="duotone" />
          </span>
          <div className="flex-1 text-left">
            <DialogTitle>Nueva consulta sin cita</DialogTitle>
            <DialogDescription>Para atención de urgencia sin una cita previa.</DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="nc-reason">Motivo</Label>
            <Input
              id="nc-reason"
              placeholder="Ej. Vómito y decaimiento"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          {errorMessage && <p className="text-[13px] text-destructive">{errorMessage}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={closeAndReset}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!reason.trim() || createConsultation.isPending}
            onClick={handleSubmit}
          >
            {createConsultation.isPending ? "Creando…" : "Crear consulta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
