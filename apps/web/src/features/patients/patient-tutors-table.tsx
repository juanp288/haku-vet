"use client";

import type { PatientTutorLink } from "@vetclinic/contracts";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/api-error";
import { useSetPrimaryTutor, useUnlinkTutor } from "./use-patients";

interface PatientTutorsTableProps {
  patientId: string;
  tutors: PatientTutorLink[];
}

export function PatientTutorsTable({ patientId, tutors }: PatientTutorsTableProps) {
  const setPrimary = useSetPrimaryTutor(patientId);
  const unlink = useUnlinkTutor(patientId);
  const onlyOneTutor = tutors.length <= 1;

  const unlinkErrorMessage = getApiErrorMessage(
    unlink.error,
    "No se pudo desvincular al acudiente. Intente de nuevo.",
  );

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Acudiente</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Relación</TableHead>
            <TableHead>Principal</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tutors.map((tutor) => (
            <TableRow key={tutor.tutorId}>
              <TableCell>{tutor.tutorName}</TableCell>
              <TableCell className="text-muted-foreground">{tutor.tutorPhone}</TableCell>
              <TableCell className="text-muted-foreground">
                {tutor.relationship ?? "—"}
              </TableCell>
              <TableCell>
                {tutor.isPrimary ? (
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[12px] text-brand-700">
                    Principal
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={setPrimary.isPending}
                    onClick={() =>
                      setPrimary.mutate({ params: { id: patientId, tutorId: tutor.tutorId } })
                    }
                  >
                    Marcar como principal
                  </Button>
                )}
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={onlyOneTutor || unlink.isPending}
                  title={onlyOneTutor ? "No se puede desvincular al único acudiente." : undefined}
                  onClick={() =>
                    unlink.mutate({ params: { id: patientId, tutorId: tutor.tutorId } })
                  }
                >
                  Desvincular
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {unlinkErrorMessage && (
        <p className="mt-2 text-[13px] text-destructive">{unlinkErrorMessage}</p>
      )}
    </div>
  );
}
