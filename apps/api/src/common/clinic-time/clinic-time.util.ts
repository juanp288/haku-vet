export interface DateParts {
  year: number;
  month: number;
  day: number;
}

/**
 * Regla 7 de CLAUDE.md: "hoy" nunca se decide con la zona horaria del
 * servidor ni del navegador. Se calcula a partir de ClinicSettings.timezone.
 */
export function getDatePartsInTimezone(date: Date, timezone: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/**
 * `birthDate` se guarda como fecha pura (medianoche UTC): sus componentes
 * calendario se leen directo en UTC, sin pasar por la zona de la clínica.
 */
export function getDatePartsUTC(date: Date): DateParts {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/** Edad en formato "3 años 2 meses", nunca almacenada (doc CLAUDE.md, errores frecuentes). */
export function formatAgeLabel(birthDate: DateParts, today: DateParts): string {
  let years = today.year - birthDate.year;
  let months = today.month - birthDate.month;

  if (today.day < birthDate.day) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) {
    years = 0;
    months = 0;
  }

  if (years === 0 && months === 0) {
    return "Menos de 1 mes";
  }

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} año${years === 1 ? "" : "s"}`);
  }
  if (months > 0) {
    parts.push(`${months} mes${months === 1 ? "" : "es"}`);
  }
  return parts.join(" ");
}
