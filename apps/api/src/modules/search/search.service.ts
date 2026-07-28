import { Injectable } from "@nestjs/common";
import type { SearchResult } from "@vetclinic/contracts";
import { SearchRepository, type SearchRow } from "./search.repository";

/** Nunca aparece en un teléfono real — así ILIKE nunca hace match "de gratis". */
const NEVER_MATCH = "##NEVER_MATCH##";

/** Igual normalización que al guardar el teléfono (doc 01 "Convenciones"). */
function extractDigits(query: string): string {
  return query.replace(/[^\d+]/g, "");
}

@Injectable()
export class SearchService {
  constructor(private readonly searchRepository: SearchRepository) {}

  async search(query: string): Promise<SearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const namePattern = `%${trimmed}%`;
    const digits = extractDigits(trimmed);
    const phonePattern = digits ? `%${digits}%` : NEVER_MATCH;

    const rows = await this.searchRepository.search(namePattern, phonePattern);
    return rows.map((row) => this.toDto(row));
  }

  private toDto(row: SearchRow): SearchResult {
    return {
      patientId: row.patientId,
      patientName: row.patientName,
      species: row.species,
      primaryTutorName: `${row.primaryTutorFirstName} ${row.primaryTutorLastName}`,
      primaryTutorPhone: row.primaryTutorPhone,
    };
  }
}
