"use client";

import type { Patient, Tutor } from "@vetclinic/contracts";
import { getAvatarColors, getInitials } from "@/lib/avatar";
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

interface TutorsTableProps {
  tutors: Tutor[];
  patients: Patient[];
  selectedTutorId: string | null;
  onSelect: (tutorId: string) => void;
}

export function TutorsTable({ tutors, patients, selectedTutorId, onSelect }: TutorsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Acudiente</TableHead>
          <TableHead>Documento</TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead>Mascotas</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {tutors.map((tutor) => {
          const fullName = `${tutor.firstName} ${tutor.lastName}`;
          const colors = getAvatarColors(tutor.id);
          const petsSummary = patients
            .filter((patient) => patient.tutors.some((link) => link.tutorId === tutor.id))
            .map((patient) => patient.name);
          const isSelected = tutor.id === selectedTutorId;

          return (
            <TableRow
              key={tutor.id}
              className={cn("cursor-pointer", isSelected && "bg-brand-100/60")}
              onClick={() => onSelect(tutor.id)}
            >
              <TableCell>
                <span className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] text-[11.5px] font-extrabold",
                      colors.tint,
                      colors.ink,
                    )}
                  >
                    {getInitials(fullName)}
                  </span>
                  <span className="font-bold">{fullName}</span>
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-neutral-700">
                {DOCUMENT_TYPE_LABELS[tutor.documentType]} {tutor.documentNumber}
              </TableCell>
              <TableCell className="whitespace-nowrap text-neutral-700">{tutor.phone}</TableCell>
              <TableCell className="text-neutral-700">
                {petsSummary.length === 0 ? "Sin mascotas" : petsSummary.join(", ")}
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={cn(
                    "text-[13px] font-bold",
                    isSelected ? "text-brand-700" : "text-neutral-500",
                  )}
                >
                  Ver ficha →
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
