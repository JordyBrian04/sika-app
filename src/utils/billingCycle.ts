type Frequency = "semaine" | "mensuel" | "annuel" | "personnalise";

function parseISODate(dateStr: string) {
  // dateStr: "YYYY-MM-DD"
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatShortFR(d: Date) {
  const months = [
    "Jan",
    "Fév",
    "Mar",
    "Avr",
    "Mai",
    "Juin",
    "Juil",
    "Aoû",
    "Sep",
    "Oct",
    "Nov",
    "Déc",
  ];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function addYears(date: Date, years: number) {
  const copy = new Date(date);
  copy.setFullYear(copy.getFullYear() + years);
  return copy;
}

function diffDays(a: Date, b: Date) {
  // différence en jours (a - b) en arrondissant au jour (UTC safe)
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcA - utcB) / (1000 * 60 * 60 * 24));
}

/**
 * Retourne le cycle courant : start (début), end (fin), progress (0..1), daysLeft
 * Hypothèse : nextDate = prochaine date de paiement ("YYYY-MM-DD")
 * start = date précédente (nextDate - interval)
 */
export function computeBillingCycle(params: {
  nextDate: string; // ex "2026-03-13"
  frequency: Frequency; // "mensuel" etc
  intervalCount: number; // ex 1 (tous les 1 mois)
  today?: Date; // optionnel
  customIntervalDays?: number; // si frequency="personnalise"
}) {
  const today = params.today ?? new Date();
  const next = parseISODate(params.nextDate);

  let start: Date;

  if (params.frequency === "semaine") {
    start = addDays(next, -7 * params.intervalCount);
  } else if (params.frequency === "mensuel") {
    start = addMonths(next, -1 * params.intervalCount);
  } else if (params.frequency === "annuel") {
    start = addYears(next, -1 * params.intervalCount);
  } else {
    const days = params.customIntervalDays ?? (params.intervalCount || 1);
    start = addDays(next, -days);
  }

  const totalDays = Math.max(diffDays(next, start), 1); // éviter /0
  const daysRemaining = Math.max(diffDays(next, today), 0);
  const daysPassed = Math.min(Math.max(diffDays(today, start), 0), totalDays);

  const progress = Math.min(Math.max(daysPassed / totalDays, 0), 1);

  return {
    start,
    end: next,
    progress,
    daysRemaining,
  };
}
