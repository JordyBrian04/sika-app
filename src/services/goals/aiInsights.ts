import { all, getOne } from "@/src/db";
import { toYYYYMMDD } from "@/src/utils/date";

type InsightCard = {
  observation: string;
  recommendation: string;
  stats: {
    weekendSharePct: number;
    wowPct: number; // week over week change %
    thisWeekSpend: number;
    prevWeekSpend: number;
    avgDailyThisWeek: number;
  };
};

type Options = {
  today?: string; // YYYY-MM-DD
  focusCategoryId?: number | null; // ex: "Loisirs"
  focusCategoryName?: string; // ex: "loisirs"
  goalId?: number | null; // objectif ex: macbook
  defaultCutAmount?: number; // montant de réduction si pas d’info budget
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function fmtMoney(n: number) {
  return Math.round(n).toLocaleString("fr-FR");
}

// 7 derniers jours [today-6 .. today]
async function sumExpensesBetween(
  from: string,
  to: string,
  categoryId?: number | null,
) {
  const whereCat = categoryId ? " AND category_id = ?" : "";
  const params: any[] = categoryId ? [from, to, categoryId] : [from, to];

  const row = await getOne<{ total: number }>(
    `
    SELECT COALESCE(SUM(amount),0) as total
    FROM transactions
    WHERE type='depense'
      AND date >= date(?)
      AND date <= date(?)
      ${whereCat}
    `,
    params,
  );

  return Number(row?.total ?? 0);
}

async function weekendShareLast7Days(
  today: string,
  categoryId?: number | null,
) {
  // weekend = samedi(6) + dimanche(0)
  const whereCat = categoryId ? " AND category_id = ?" : "";
  const params: any[] = categoryId ? [today, categoryId] : [today];

  const rows = await all<{ is_weekend: number; total: number }>(
    `
    SELECT
      CASE WHEN strftime('%w', date) IN ('0','6') THEN 1 ELSE 0 END as is_weekend,
      COALESCE(SUM(amount),0) as total
    FROM transactions
    WHERE type='depense'
      AND date >= date(?, '-6 day')
      AND date <= date(?)
      ${whereCat}
    GROUP BY is_weekend
    `,
    categoryId ? [today, today, categoryId] : [today, today],
  );

  let weekend = 0;
  let weekday = 0;
  for (const r of rows) {
    if (r.is_weekend === 1) weekend += Number(r.total ?? 0);
    else weekday += Number(r.total ?? 0);
  }
  const total = weekend + weekday;
  const share = total === 0 ? 0 : (weekend / total) * 100;

  return { weekend, weekday, total, sharePct: share };
}

async function weekOverWeekSpend(today: string, categoryId?: number | null) {
  // this week: today-6..today
  // prev week: today-13..today-7
  const thisFrom = await getOne<{ d: string }>(
    `SELECT date(?, '-6 day') as d`,
    [today],
  );
  const prevFrom = await getOne<{ d: string }>(
    `SELECT date(?, '-13 day') as d`,
    [today],
  );
  const prevTo = await getOne<{ d: string }>(`SELECT date(?, '-7 day') as d`, [
    today,
  ]);

  const thisWeekSpend = await sumExpensesBetween(
    thisFrom!.d,
    today,
    categoryId,
  );
  const prevWeekSpend = await sumExpensesBetween(
    prevFrom!.d,
    prevTo!.d,
    categoryId,
  );

  const wowPct =
    prevWeekSpend === 0
      ? thisWeekSpend > 0
        ? 100
        : 0
      : ((thisWeekSpend - prevWeekSpend) / prevWeekSpend) * 100;

  return { thisWeekSpend, prevWeekSpend, wowPct };
}

async function avgDailySpendLast7Days(
  today: string,
  categoryId?: number | null,
) {
  const fromRow = await getOne<{ d: string }>(`SELECT date(?, '-6 day') as d`, [
    today,
  ]);
  const total = await sumExpensesBetween(fromRow!.d, today, categoryId);
  return total / 7;
}

/**
 * Estime ta vitesse d’épargne (FCFA / semaine) via goal_contributions (4 dernières semaines).
 * Si tu n’as pas cette table, la fonction retournera 0 et on utilisera une estimation simple.
 */
async function getWeeklySavingPace(today: string, goalId?: number | null) {
  // si pas d’objectif => toutes les contributions
  const whereGoal = goalId ? "WHERE goal_id = ?" : "";
  const params = goalId ? [goalId] : [];

  const row = await getOne<{ total: number }>(
    `
    SELECT COALESCE(SUM(amount),0) as total
    FROM goal_contributions
    ${whereGoal}
      ${whereGoal ? "AND" : "WHERE"} date >= date(?, '-27 day')
      AND date <= date(?)
    `,
    goalId ? [goalId, today, today] : [today, today],
  );

  const total4w = Number(row?.total ?? 0);
  return total4w / 4; // FCFA/semaine
}

/**
 * Optionnel : si tu as une table budgets (monthly limit par catégorie), adapte ici.
 * Sinon on renvoie null.
 */
async function getMonthlyBudgetForCategory(
  categoryId?: number | null,
): Promise<number | null> {
  if (!categoryId) return null;

  // Exemple si tu as une table budgets(category_id, monthly_limit)
  // Sinon, laisse comme ça => null.
  try {
    const row = await getOne<{ monthly_limit: number }>(
      `SELECT monthly_limit FROM budgets WHERE category_id=? LIMIT 1`,
      [categoryId],
    );
    if (!row) return null;
    return Number(row.monthly_limit ?? 0);
  } catch {
    return null;
  }
}

/**
 * Génère le texte Observation + Recommandation.
 * - Observation : part week-end + évolution WoW
 * - Reco : réduit budget catégorie + "gagner X semaines" (basé sur vitesse d’épargne)
 */
export async function getAIInsights(
  options: Options = {},
): Promise<InsightCard> {
  const today = options.today ?? toYYYYMMDD(new Date());
  const categoryId = options.focusCategoryId ?? null;
  const catName = options.focusCategoryName ?? "loisirs";

  const weekend = await weekendShareLast7Days(today, categoryId);
  const wow = await weekOverWeekSpend(today, categoryId);
  const avgDaily = await avgDailySpendLast7Days(today, categoryId);

  // ---- Observation (style comme ta capture)
  // "Tu dépenses surtout le week-end (en moyenne +22% vs semaine)."
  // On peut interpréter "+22%" comme la hausse WoW (simple, lisible).
  const wowRounded = Math.round(wow.wowPct);
  const weekendRounded = Math.round(weekend.sharePct);

  const observation =
    wow.prevWeekSpend === 0 && wow.thisWeekSpend === 0
      ? `Pas assez de données cette semaine pour détecter une tendance.`
      : `Tu dépenses surtout le week-end (≈ ${weekendRounded}% des dépenses) · moyenne ${wowRounded >= 0 ? "+" : ""}${wowRounded}% vs semaine précédente.`;

  // ---- Recommendation
  // On propose un cut, basé sur :
  // - si hausse WoW élevée => cut = ~20% de la dépense semaine, min 5k
  // - sinon cut = 10k (ou ton defaultCutAmount)
  const monthlyBudget = await getMonthlyBudgetForCategory(categoryId);
  const baseCut =
    options.defaultCutAmount ??
    Math.max(5000, Math.round((wow.thisWeekSpend * 0.2) / 1000) * 1000); // arrondi au 1000

  // Si budget existe : on propose plutôt une réduction relative au budget (ex 10%).
  const cutAmount =
    monthlyBudget && monthlyBudget > 0
      ? Math.max(5000, Math.round((monthlyBudget * 0.1) / 1000) * 1000)
      : baseCut;

  // Vitesse d’épargne => “gagner X semaines”
  let weeklyPace = 0;
  try {
    weeklyPace = await getWeeklySavingPace(today, options.goalId ?? null);
  } catch {
    weeklyPace = 0;
  }

  // Si pas de rythme d’épargne, on estime un rythme minimal (ex 5k/semaine)
  const pace = weeklyPace > 0 ? weeklyPace : 5000;

  const weeksGained = Math.max(1, Math.round(cutAmount / pace));

  const recommendation = `Réduis ton budget ${catName} de ${fmtMoney(cutAmount)} FCFA pour gagner ≈ ${weeksGained} semaine(s) sur ton objectif.`;

  return {
    observation,
    recommendation,
    stats: {
      weekendSharePct: weekend.sharePct,
      wowPct: wow.wowPct,
      thisWeekSpend: wow.thisWeekSpend,
      prevWeekSpend: wow.prevWeekSpend,
      avgDailyThisWeek: avgDaily,
    },
  };
}
