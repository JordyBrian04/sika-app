export function toYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromYYYYMMDD(s: string) {
  // interprétation locale (OK pour budget/paiements)
  return new Date(`${s}T00:00:00`);
}

function daysInMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonthsClamped(date: Date, months: number) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();

  const targetMonth = m + months;
  const targetYear = y + Math.floor(targetMonth / 12);
  const targetMonthIndex = ((targetMonth % 12) + 12) % 12;

  const dim = daysInMonth(targetYear, targetMonthIndex);
  const clampedDay = Math.min(day, dim);

  return new Date(targetYear, targetMonthIndex, clampedDay);
}

export function addYearsClamped(date: Date, years: number) {
  return addMonthsClamped(date, years * 12);
}

export type RecurringFrequency =
  | "semaine"
  | "mensuel"
  | "annuel"
  | "personnalisé";

export function computeNextDate(
  currentNextDateYYYYMMDD: string,
  frequency: RecurringFrequency,
  intervalCount: number,
) {
  const base = fromYYYYMMDD(currentNextDateYYYYMMDD);
  const n = Math.max(1, intervalCount || 1);

  let next: Date;
  if (frequency === "semaine") next = addDays(base, 7 * n);
  else if (frequency === "mensuel") next = addMonthsClamped(base, n);
  else if (frequency === "annuel") next = addYearsClamped(base, n);
  else next = addDays(base, n); // 'personnalisé' => n jours (simple)

  return toYYYYMMDD(next);
}
