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
 * C1: hora de pared ("08:00") de un instante UTC en la zona de la clínica,
 * para que el frontend nunca tenga que convertir zonas horarias — recibe
 * el string ya resuelto y solo lo compara contra las franjas de la grilla.
 */
export function formatTimeInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Par con `formatTimeInTimezone` — "08:30" → 510 minutos desde medianoche. */
export function parseTimeLabelToMinutes(label: string): number {
  const [hour, minute] = label.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
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

export function parseDateParts(value: string): DateParts {
  const [year, month, day] = value.split("-").map(Number);
  return { year: year ?? 0, month: month ?? 0, day: day ?? 0 };
}

export function formatDateParts(date: DateParts): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

/** Día de la semana (0=domingo…6=sábado, igual que ClinicSettings.workingDays) — cálculo de calendario puro, sin zona horaria. */
export function getDayOfWeekUTC(date: DateParts): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

/** Suma (o resta, con `days` negativo) días de calendario — aritmética pura, `Date.UTC` normaliza el desborde de mes/año. */
export function addDaysToDateParts(date: DateParts, days: number): DateParts {
  const result = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
  };
}

/**
 * RN-19: convierte una hora de pared ("las 8:00 de la clínica") en el
 * instante UTC real que representa, dado el timezone de la clínica. Usa
 * `Intl.DateTimeFormat` en vez de una librería de zonas horarias (regla 9
 * de CLAUDE.md: nada de dependencias nuevas) — es la misma técnica que
 * usan internamente librerías como date-fns-tz: una primera aproximación
 * tratando la hora de pared como si fuera UTC, medir cuánto se desvía al
 * formatearla de vuelta en el timezone real, y corregir esa desviación.
 */
export function getUtcInstantForZonedTime(
  date: DateParts,
  hour: number,
  minute: number,
  timezone: string,
): Date {
  const guessUtcMs = Date.UTC(date.year, date.month - 1, date.day, hour, minute, 0);

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(new Date(guessUtcMs));
  const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value);

  const asUtcAgainMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  const offsetMs = asUtcAgainMs - guessUtcMs;
  return new Date(guessUtcMs - offsetMs);
}

/** Rango [inicio, fin) de un día calendario completo de la clínica, como instantes UTC reales. */
export function getDayRangeInTimezone(
  date: DateParts,
  timezone: string,
): { start: Date; end: Date } {
  return {
    start: getUtcInstantForZonedTime(date, 0, 0, timezone),
    end: getUtcInstantForZonedTime(date, 24, 0, timezone),
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
