"use client";

import type { Tutor } from "@vetclinic/contracts";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DOCUMENT_TYPE_LABELS } from "./document-type-labels";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface TutorsTableProps {
  tutors: Tutor[];
  highlightId: string | null;
}

export function TutorsTable({ tutors, highlightId }: TutorsTableProps) {
  if (tutors.length === 0) {
    return <p className="text-sm opacity-70">Todavía no hay acudientes registrados.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Documento</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead>Correo</TableHead>
          <TableHead>Autorización</TableHead>
          <TableHead>Registrado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tutors.map((tutor) => (
          <TableRow
            key={tutor.id}
            className={cn(highlightId === tutor.id && "bg-brand-100")}
          >
            <TableCell>
              {DOCUMENT_TYPE_LABELS[tutor.documentType]} {tutor.documentNumber}
            </TableCell>
            <TableCell>
              {tutor.firstName} {tutor.lastName}
            </TableCell>
            <TableCell className="text-muted-foreground">{tutor.phone}</TableCell>
            <TableCell className="text-muted-foreground">{tutor.email ?? "—"}</TableCell>
            <TableCell>
              {tutor.dataConsentAt ? formatDate(tutor.dataConsentAt) : "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDate(tutor.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
