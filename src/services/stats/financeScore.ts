import { all, getOne } from "@/src/db";
import { toYYYYMMDD } from "@/src/utils/date";

type ScoreBreakdown = {
  total: number; // 0..100
  regularity: number; // 0..100
  discipline: number; // 0..100
  budgetControl: number; // 0..100
  savingPower: number; // 0..100
  meta: {
    periodDays: number;
    txDays: number;
    noTxDays: number;
    spendDays: number;
    noSpendDays: number;
    weekendSpendSharePct: number;
    budgetsCount: number;
    budgetsOverCount: number;
    budgetsNearCount: number;
    income: number;
    expense: number;
    net: number;
    netPerDay: number;
  };
  summary: {
    label: string; // "Fragile" | "En progrès" | "Solide"
    message: string;
  };
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round(n: number) {
  return Math.round(n);
}

function dayOfWeek(dateStr: string) {
  return new Date(dateStr + "T00:00:00").getDay(); // 0..6
}

async function getPeriodStats(today: string, days: number) {
  const row = await getOne<{
    income: number;
    expense: number;
    tx_days: number;
    spend_days: number;
  }>(
    `
    SELECT
      COALESCE(SUM(CASE WHEN type='entree' THEN amount END),0) as income,
      COALESCE(SUM(CASE WHEN type='depense' THEN amount END),0) as expense,
      (SELECT COUNT(*) FROM (
        SELECT date FROM transactions
        WHERE date >= date(?, ?)
          AND date <= date(?)
        GROUP BY date
      )) as tx_days,
      (SELECT COUNT(*) FROM (
        SELECT date FROM transactions
        WHERE type='depense'
          AND date >= date(?, ?)
          AND date <= date(?)
        GROUP BY date
      )) as spend_days
    FROM transactions
    WHERE date >= date(?, ?)
      AND date <= date(?)
    `,
    [
      today,
      `-${days - 1} day`,
      today,
      today,
      `-${days - 1} day`,
      today,
      today,
      `-${days - 1} day`,
      today,
    ],
  );

  return {
    income: Number(row?.income ?? 0),
    expense: Number(row?.expense ?? 0),
    txDays: Number(row?.tx_days ?? 0),
    spendDays: Number(row?.spend_days ?? 0),
  };
}

async function getWeekendSpendShare(today: string, days: number) {
  const rows = await all<{ date: string; amount: number }>(
    `
    SELECT date, amount
    FROM transactions
    WHERE type='depense'
      AND date >= date(?, ?)
      AND date <= date(?)
    `,
    [today, `-${days - 1} day`, today],
  );

  let weekend = 0;
  let total = 0;

  for (const r of rows) {
    total += Number(r.amount ?? 0);
    const dow = dayOfWeek(r.date);
    if (dow === 0 || dow === 6) weekend += Number(r.amount ?? 0);
  }

  const share = total === 0 ? 0 : (weekend / total) * 100;
  return { weekendSpendSharePct: share };
}

async function getBudgetStatusForCurrentMonth(today: string) {
  const d = new Date(today + "T00:00:00");
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  // budgets du mois + dépenses du mois
  const rows = await all<{
    category_id: number;
    limit_amount: number;
    spent: number;
    ratio: number;
  }>(
    `
    SELECT
      b.category_id,
      b.limit_amount as limit_amount,
      COALESCE(SUM(t.amount),0) as spent,
      CASE
        WHEN b.limit_amount <= 0 THEN 0
        ELSE (COALESCE(SUM(t.amount),0) * 1.0 / b.limit_amount)
      END as ratio
    FROM budgets b
    LEFT JOIN transactions t
      ON t.category_id = b.category_id
     AND t.type='depense'
     AND CAST(strftime('%m', t.date) AS INTEGER)=b.month
     AND CAST(strftime('%Y', t.date) AS INTEGER)=b.year
    WHERE b.month=? AND b.year=?
    GROUP BY b.category_id, b.limit_amount
    `,
    [month, year],
  );

  const budgetsCount = rows.length;
  const over = rows.filter((r) => r.ratio >= 1).length;
  const near = rows.filter((r) => r.ratio >= 0.8 && r.ratio < 1).length;

  return { budgetsCount, budgetsOverCount: over, budgetsNearCount: near };
}

/**
 * Score financier global (0..100) + sous-scores.
 * days=30 par défaut (meilleure fenêtre pour un score stable).
 */
export async function getFinanceScore(options?: {
  today?: string;
  days?: number; // 30 recommandé
}): Promise<ScoreBreakdown> {
  const today = options?.today ?? toYYYYMMDD(new Date());
  const days = options?.days ?? 30;

  const [period, weekend, budget] = await Promise.all([
    getPeriodStats(today, days),
    getWeekendSpendShare(today, days),
    getBudgetStatusForCurrentMonth(today),
  ]);

  const periodDays = days;
  const txDays = period.txDays;
  const noTxDays = Math.max(0, periodDays - txDays);

  const spendDays = period.spendDays;
  const noSpendDays = Math.max(0, periodDays - spendDays);

  const income = period.income;
  const expense = period.expense;
  const net = income - expense;
  const netPerDay = net / Math.max(1, periodDays);

  const weekendSpendSharePct = weekend.weekendSpendSharePct;

  // ---------------------------
  // 1) Regularity (0..100)
  // ---------------------------
  // txDays/periodDays => plus tu notes souvent, plus c'est haut
  const regularity = round(clamp((txDays / periodDays) * 100, 0, 100));

  // ---------------------------
  // 2) Discipline (0..100)
  // ---------------------------
  // + jours sans dépense (bien)
  // - si tu dépenses surtout week-end (souvent impulsif)
  const noSpendScore = clamp((noSpendDays / periodDays) * 100, 0, 100);
  // weekend share idéal < 35%
  const weekendPenalty = clamp((weekendSpendSharePct - 35) * 1.2, 0, 40); // max -40
  const discipline = round(clamp(noSpendScore - weekendPenalty + 30, 0, 100)); // +30 pour ne pas être trop dur

  // ---------------------------
  // 3) Budget control (0..100)
  // ---------------------------
  // si pas de budgets -> score moyen bas (incite à en créer)
  let budgetControl = 45;
  if (budget.budgetsCount > 0) {
    // pénalité dépassements / proches
    const overPenalty = budget.budgetsOverCount * 18; // chaque dépassement coûte cher
    const nearPenalty = budget.budgetsNearCount * 8;
    budgetControl = round(clamp(100 - overPenalty - nearPenalty, 0, 100));
  }

  // ---------------------------
  // 4) Saving power (0..100)
  // ---------------------------
  // net positif = capacité à épargner
  // netPerDay relatif => si tu gagnes +1000/jour, c'est bien.
  // si net <= 0 => score faible
  let savingPower = 15;
  if (net > 0) {
    // on scale netPerDay: 0..5000 => 0..100 (cap)
    savingPower = round(clamp((netPerDay / 5000) * 100, 0, 100));
    savingPower = clamp(savingPower + 25, 0, 100); // boost pour net positif
  } else {
    // plus tu es négatif, plus ça descend
    const neg = Math.abs(netPerDay);
    savingPower = round(clamp(25 - (neg / 3000) * 25, 0, 25));
  }

  // ---------------------------
  // Total score (pondération)
  // ---------------------------
  const total = round(
    clamp(
      regularity * 0.28 +
        discipline * 0.22 +
        budgetControl * 0.25 +
        savingPower * 0.25,
      0,
      100,
    ),
  );

  let label = "En progrès";
  let message =
    "Continue : stabilise ta régularité et réduis une catégorie pour libérer de l’épargne.";

  if (total < 40) {
    label = "Fragile";
    message =
      "Priorité : redevenir régulier (1 transaction/jour) et créer 2 budgets (Alimentation + Transport).";
  } else if (total >= 70) {
    label = "Solide";
    message =
      "Très bon niveau. Optimise maintenant : augmente ton épargne auto et baisse les dépenses week-end.";
  }

  return {
    total,
    regularity,
    discipline,
    budgetControl,
    savingPower,
    meta: {
      periodDays,
      txDays,
      noTxDays,
      spendDays,
      noSpendDays,
      weekendSpendSharePct: round(weekendSpendSharePct),
      budgetsCount: budget.budgetsCount,
      budgetsOverCount: budget.budgetsOverCount,
      budgetsNearCount: budget.budgetsNearCount,
      income,
      expense,
      net,
      netPerDay: Math.round(netPerDay),
    },
    summary: { label, message },
  };
}
