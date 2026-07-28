import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchRow } from "./search.repository";
import { SearchService } from "./search.service";
import type { SearchRepository } from "./search.repository";

function buildRow(overrides: Partial<SearchRow> = {}): SearchRow {
  return {
    patientId: "patient_1",
    patientName: "Luna",
    species: "CANINO",
    primaryTutorFirstName: "María Fernanda",
    primaryTutorLastName: "Núñez Rojas",
    primaryTutorPhone: "+573006542211",
    ...overrides,
  };
}

describe("SearchService", () => {
  let repository: { search: ReturnType<typeof vi.fn> };
  let service: SearchService;

  beforeEach(() => {
    repository = { search: vi.fn().mockResolvedValue([]) };
    service = new SearchService(repository as unknown as SearchRepository);
  });

  it("no consulta el repositorio con una búsqueda vacía", async () => {
    expect(await service.search("")).toEqual([]);
    expect(await service.search("   ")).toEqual([]);
    expect(repository.search).not.toHaveBeenCalled();
  });

  it("arma el patrón de nombre como %query% recortado", async () => {
    await service.search("  Luna  ");
    expect(repository.search).toHaveBeenCalledWith("%Luna%", expect.any(String));
  });

  it("extrae solo dígitos y '+' para el patrón de teléfono", async () => {
    await service.search("+57 (300) 654-2211");
    expect(repository.search).toHaveBeenCalledWith(
      expect.any(String),
      "%+573006542211%",
    );
  });

  it("usa un patrón imposible de matchear cuando la búsqueda no tiene dígitos", async () => {
    await service.search("Luna");
    const [, phonePattern] = repository.search.mock.calls[0] as [string, string];
    expect(phonePattern).not.toContain("%");
  });

  it("mapea la fila a un resultado con el nombre del acudiente principal unido", async () => {
    repository.search.mockResolvedValue([buildRow()]);

    const [result] = await service.search("Luna");

    expect(result).toEqual({
      patientId: "patient_1",
      patientName: "Luna",
      species: "CANINO",
      primaryTutorName: "María Fernanda Núñez Rojas",
      primaryTutorPhone: "+573006542211",
    });
  });
});
