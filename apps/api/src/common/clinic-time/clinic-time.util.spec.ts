import { describe, expect, it } from "vitest";
import { formatAgeLabel, getDatePartsInTimezone, getDatePartsUTC } from "./clinic-time.util";

describe("getDatePartsInTimezone", () => {
  it("lee el día correcto incluso cuando UTC ya cruzó la medianoche", () => {
    // 2026-08-05T02:00:00Z todavía es 2026-08-04 tarde en Bogotá (UTC-5).
    const parts = getDatePartsInTimezone(new Date("2026-08-05T02:00:00.000Z"), "America/Bogota");
    expect(parts).toEqual({ year: 2026, month: 8, day: 4 });
  });
});

describe("getDatePartsUTC", () => {
  it("extrae año, mes y día directo de la fecha en UTC", () => {
    expect(getDatePartsUTC(new Date("2020-05-01T00:00:00.000Z"))).toEqual({
      year: 2020,
      month: 5,
      day: 1,
    });
  });
});

describe("formatAgeLabel", () => {
  it('formatea "3 años 2 meses" (ejemplo del documento 03)', () => {
    const label = formatAgeLabel(
      { year: 2023, month: 6, day: 10 },
      { year: 2026, month: 8, day: 15 },
    );
    expect(label).toBe("3 años 2 meses");
  });

  it("omite los años cuando la mascota tiene menos de uno", () => {
    const label = formatAgeLabel(
      { year: 2026, month: 3, day: 1 },
      { year: 2026, month: 8, day: 15 },
    );
    expect(label).toBe("5 meses");
  });

  it("omite los meses cuando la edad es exacta en años", () => {
    const label = formatAgeLabel(
      { year: 2024, month: 8, day: 15 },
      { year: 2026, month: 8, day: 15 },
    );
    expect(label).toBe("2 años");
  });

  it('devuelve "Menos de 1 mes" para un recién nacido', () => {
    const label = formatAgeLabel(
      { year: 2026, month: 8, day: 1 },
      { year: 2026, month: 8, day: 15 },
    );
    expect(label).toBe("Menos de 1 mes");
  });

  it("no cumple el mes todavía si el día de hoy es anterior al de nacimiento", () => {
    // Nació el 20; hoy es 15 del mes siguiente => 0 años 11 meses, no 1 año.
    const label = formatAgeLabel(
      { year: 2025, month: 9, day: 20 },
      { year: 2026, month: 8, day: 15 },
    );
    expect(label).toBe("10 meses");
  });
});
