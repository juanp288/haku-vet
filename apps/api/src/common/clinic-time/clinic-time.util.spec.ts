import { describe, expect, it } from "vitest";
import {
  addDaysToDateParts,
  formatAgeLabel,
  formatDateParts,
  formatTimeInTimezone,
  getDatePartsInTimezone,
  getDatePartsUTC,
  getDayOfWeekUTC,
  getDayRangeInTimezone,
  getUtcInstantForZonedTime,
  parseDateParts,
  parseTimeLabelToMinutes,
} from "./clinic-time.util";

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

describe("parseDateParts", () => {
  it("separa año, mes y día de una fecha AAAA-MM-DD", () => {
    expect(parseDateParts("2026-08-06")).toEqual({ year: 2026, month: 8, day: 6 });
  });
});

describe("formatTimeInTimezone", () => {
  it("formatea la hora de pared en la zona de la clínica, con ceros a la izquierda", () => {
    // 13:00 UTC en América/Bogotá (UTC-5) son las 08:00 locales.
    expect(formatTimeInTimezone(new Date("2026-08-06T13:00:00.000Z"), "America/Bogota")).toBe(
      "08:00",
    );
    expect(formatTimeInTimezone(new Date("2026-08-06T13:05:00.000Z"), "America/Bogota")).toBe(
      "08:05",
    );
  });
});

describe("parseTimeLabelToMinutes", () => {
  it("convierte HH:MM a minutos desde medianoche", () => {
    expect(parseTimeLabelToMinutes("08:30")).toBe(510);
    expect(parseTimeLabelToMinutes("00:00")).toBe(0);
    expect(parseTimeLabelToMinutes("23:59")).toBe(1439);
  });
});

describe("formatDateParts", () => {
  it("rellena con ceros mes y día de un dígito", () => {
    expect(formatDateParts({ year: 2026, month: 3, day: 7 })).toBe("2026-03-07");
  });
});

describe("getDayOfWeekUTC", () => {
  it("2000-01-01 fue sábado (ancla conocida, sin depender de la fecha del sistema)", () => {
    expect(getDayOfWeekUTC({ year: 2000, month: 1, day: 1 })).toBe(6);
  });

  it("2000-01-02 fue domingo", () => {
    expect(getDayOfWeekUTC({ year: 2000, month: 1, day: 2 })).toBe(0);
  });
});

describe("addDaysToDateParts", () => {
  it("suma días dentro del mismo mes", () => {
    expect(addDaysToDateParts({ year: 2026, month: 8, day: 6 }, 3)).toEqual({
      year: 2026,
      month: 8,
      day: 9,
    });
  });

  it("resta días con delta negativo", () => {
    expect(addDaysToDateParts({ year: 2026, month: 8, day: 6 }, -3)).toEqual({
      year: 2026,
      month: 8,
      day: 3,
    });
  });

  it("cruza el límite de mes", () => {
    expect(addDaysToDateParts({ year: 2026, month: 8, day: 30 }, 3)).toEqual({
      year: 2026,
      month: 9,
      day: 2,
    });
  });

  it("cruza el límite de año", () => {
    expect(addDaysToDateParts({ year: 2026, month: 12, day: 30 }, 3)).toEqual({
      year: 2027,
      month: 1,
      day: 2,
    });
  });

  it("delta 0 devuelve la misma fecha", () => {
    expect(addDaysToDateParts({ year: 2026, month: 8, day: 6 }, 0)).toEqual({
      year: 2026,
      month: 8,
      day: 6,
    });
  });
});

describe("getUtcInstantForZonedTime", () => {
  it("RN-19: 8:00 en América/Bogotá (UTC-5 fijo, sin horario de verano) son las 13:00 UTC", () => {
    const instant = getUtcInstantForZonedTime({ year: 2026, month: 8, day: 6 }, 8, 0, "America/Bogota");
    expect(instant.toISOString()).toBe("2026-08-06T13:00:00.000Z");
  });

  it("resuelve el desfase correcto en un timezone con horario de verano (verano: UTC-4)", () => {
    const instant = getUtcInstantForZonedTime(
      { year: 2026, month: 8, day: 6 },
      8,
      0,
      "America/New_York",
    );
    expect(instant.toISOString()).toBe("2026-08-06T12:00:00.000Z");
  });

  it("el mismo timezone en invierno usa el otro desfase (invierno: UTC-5)", () => {
    const instant = getUtcInstantForZonedTime(
      { year: 2026, month: 1, day: 6 },
      8,
      0,
      "America/New_York",
    );
    expect(instant.toISOString()).toBe("2026-01-06T13:00:00.000Z");
  });

  it("hour=24 avanza correctamente al día siguiente (medianoche del día calendario que termina)", () => {
    const instant = getUtcInstantForZonedTime({ year: 2026, month: 8, day: 6 }, 24, 0, "America/Bogota");
    expect(instant.toISOString()).toBe("2026-08-07T05:00:00.000Z");
  });
});

describe("getDayRangeInTimezone", () => {
  it("devuelve el rango [00:00, 24:00) del día calendario como instantes UTC reales", () => {
    const range = getDayRangeInTimezone({ year: 2026, month: 8, day: 6 }, "America/Bogota");
    expect(range.start.toISOString()).toBe("2026-08-06T05:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-08-07T05:00:00.000Z");
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
