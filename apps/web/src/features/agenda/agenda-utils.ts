/**
 * `date` siempre es un string calendario puro ("2026-08-06") que ya
 * resolvió el backend (RN-19) — estas funciones nunca deben interpretarlo
 * con la zona horaria del navegador. Por eso todo pasa por `Date.UTC` y
 * `timeZone: "UTC"` explícito, incluso al mostrarlo en pantalla.
 */

export function addDays(date: string, delta: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + delta));
  return next.toISOString().slice(0, 10);
}

export function formatDateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const label = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)).toLocaleDateString("es-CO", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "Lun 03" — encabezado corto de columna para la vista semanal (C4). */
export function formatShortDateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const label = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)).toLocaleDateString("es-CO", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function timeLabelToMinutes(label: string): number {
  const [hour, minute] = label.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

export function buildSlotLabels(openingHour: number, closingHour: number, slotMinutes: number): string[] {
  const slots: string[] = [];
  for (let minutes = openingHour * 60; minutes < closingHour * 60; minutes += slotMinutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }
  return slots;
}

/** true si `appointmentTime` cae dentro de la franja [slotLabel, slotLabel + slotMinutes). */
export function isInSlot(appointmentTime: string, slotLabel: string, slotMinutes: number): boolean {
  const appointmentMinutes = timeLabelToMinutes(appointmentTime);
  const slotStart = timeLabelToMinutes(slotLabel);
  return appointmentMinutes >= slotStart && appointmentMinutes < slotStart + slotMinutes;
}

/** Citas (típicamente URGENCIA, RN-02) cuya hora cae fuera del horario configurado — no se pueden perder en silencio. */
export function isOutsideHours(
  appointmentTime: string,
  openingHour: number,
  closingHour: number,
): boolean {
  const minutes = timeLabelToMinutes(appointmentTime);
  return minutes < openingHour * 60 || minutes >= closingHour * 60;
}

/**
 * true si el slot [slotLabel, slotLabel+slotMinutes) se solapa con el rango
 * [rangeStartTime, rangeStartTime+rangeDurationMinutes) de una cita que se
 * está creando en el diálogo (todavía sin guardar) — mismo criterio de
 * solapamiento que RN-01 en el backend, solo que en minutos en vez de
 * instantes UTC. Con valores inválidos (ej. duración vacía mientras se
 * edita) las comparaciones con NaN dan `false`, así que simplemente no
 * resalta nada — no revienta.
 */
export function isSlotCoveredByRange(
  slotLabel: string,
  slotMinutes: number,
  rangeStartTime: string,
  rangeDurationMinutes: number,
): boolean {
  const slotStart = timeLabelToMinutes(slotLabel);
  const slotEnd = slotStart + slotMinutes;
  const rangeStart = timeLabelToMinutes(rangeStartTime);
  const rangeEnd = rangeStart + rangeDurationMinutes;
  return slotStart < rangeEnd && rangeStart < slotEnd;
}
