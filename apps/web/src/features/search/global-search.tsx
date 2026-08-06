"use client";

import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { SPECIES_LABELS } from "@/lib/species-labels";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useSearch } from "./use-search";

export function GlobalSearch() {
  const [input, setInput] = useState("");
  const debounced = useDebouncedValue(input, 250).trim();
  const { data, isFetching } = useSearch(debounced);
  const results = data?.body ?? [];
  const showPanel = debounced.length > 0;

  return (
    <div className="relative w-full max-w-[420px]">
      <MagnifyingGlass
        size={17}
        weight="duotone"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
      />
      <Input
        aria-label="Buscar mascota, acudiente, teléfono o documento"
        placeholder="Buscar mascota, acudiente, teléfono o documento…"
        className="pl-9"
        value={input}
        onChange={(event) => setInput(event.target.value)}
      />

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-[360px] overflow-y-auto rounded-[var(--radius-md)] border border-border bg-card p-1.5 shadow-[0_4px_12px_rgba(14,27,42,.08)]">
          {isFetching ? (
            <p className="px-3 py-2.5 text-sm opacity-70">Buscando…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2.5 text-sm opacity-70">Sin resultados.</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {results.map((result) => (
                <li key={result.patientId}>
                  <Link
                    href={`/pacientes/${result.patientId}`}
                    className="flex items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-[13.5px] hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="font-bold">{result.patientName}</span>
                      <span className="ml-1.5 text-neutral-600">
                        {SPECIES_LABELS[result.species]} · {result.primaryTutorName}
                      </span>
                    </span>
                    <span className="flex-none text-neutral-600">
                      {result.primaryTutorPhone}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
