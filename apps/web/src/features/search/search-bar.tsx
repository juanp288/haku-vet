"use client";

import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SPECIES_LABELS } from "@/lib/species-labels";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useSearch } from "./use-search";

export function SearchBar() {
  const [input, setInput] = useState("");
  const debounced = useDebouncedValue(input, 250).trim();
  const { data, isFetching } = useSearch(debounced);
  const results = data?.body ?? [];

  return (
    <div className="mb-6">
      <div className="mb-3 max-w-[460px] space-y-1.5">
        <Label htmlFor="search">Buscar por teléfono, documento, acudiente o mascota</Label>
        <Input
          id="search"
          placeholder="Ej. Luna, 3001234567, Núñez"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
      </div>

      {debounced &&
        (isFetching ? (
          <p className="text-sm opacity-70">Buscando…</p>
        ) : results.length === 0 ? (
          <p className="text-sm opacity-70">Sin resultados.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mascota</TableHead>
                <TableHead>Especie</TableHead>
                <TableHead>Acudiente principal</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.patientId}>
                  <TableCell>{result.patientName}</TableCell>
                  <TableCell>{SPECIES_LABELS[result.species]}</TableCell>
                  <TableCell>{result.primaryTutorName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {result.primaryTutorPhone}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/pacientes/${result.patientId}`}
                      className="text-brand-700 hover:underline"
                    >
                      Ver ficha
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ))}
    </div>
  );
}
