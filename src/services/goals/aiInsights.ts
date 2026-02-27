import { all, getOne } from "@/src/db";
import {
  getBudgetVsSpendForMonth,
  getCategoriesMap,
  getTxInRange,
  listTransactions,
} from "@/src/db/repositories/transactions";
import { addDays, toYYYYMMDD } from "@/src/utils/date";
import { diffDays } from "@/src/utils/goalDates";

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

export type AIInsight = {
  key: string;
  title: string;
  observation: string;
  recommendation: string;
  confidence: number; // 0..100
  impact: number; // 0..100 (à toi d'ajuster)
  meta?: Record<string, any>;
};

function confidenceFromData(params: {
  txCount: number;
  daySpan: number;
  hasBudget?: boolean;
}) {
  const { txCount, daySpan, hasBudget } = params;

  // Base sur quantité de données
  const cTx = clamp((txCount / 25) * 60, 0, 60); // 0..60
  const cDays = clamp((daySpan / 30) * 30, 0, 30); // 0..30
  const cBudget = hasBudget ? 10 : 0; // 0..10

  return Math.round(clamp(cTx + cDays + cBudget, 0, 100));
}

export function dayOfWeek(dateStr: string) {
  // 0=dimanche..6=samedi
  return new Date(dateStr + "T00:00:00").getDay();
}

function getDaySpanFromTransactions(transactions: { date: string }[]) {
  if (!transactions.length) return 0;

  const dates = transactions.map((t) =>
    new Date(t.date + "T00:00:00").getTime(),
  );

  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);

  const diffMs = maxDate - minDate;

  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

export async function getAIInsightsTop3(input?: {
  today?: string; // YYYY-MM-DD
  lookbackDays?: number; // ex: 60
  focusCategoryId?: number | null; // ex: loisirs
  monthlyBudgetTotal?: number | null; // si tu as un budget global
}): Promise<AIInsight[]> {
  const today = input?.today ?? toYYYYMMDD(new Date());
  const lookbackDays = input?.lookbackDays ?? 60;
  const from = addDays(new Date(today), -lookbackDays);

  const [tx, catsMap] = await Promise.all([
    getTxInRange(toYYYYMMDD(from), today),
    getCategoriesMap(),
  ]);

  const daySpan = diffDays(from, new Date(today)) + 1;
  const txCount = tx.length;

  // Si pas assez de data => on sort quand même 1-2 insights mais confiance faible
  const expenses = tx.filter((t) => t.type === "depense");
  const incomes = tx.filter((t) => t.type === "entree");
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);

  // ===== Insight A: “Week-end tu dépenses +X%” =====
  const weekendExpense = expenses
    .filter((t) => {
      const d = dayOfWeek(t.date);
      return d === 0 || d === 6;
    })
    .reduce((s, t) => s + t.amount, 0);

  const weekdayExpense = totalExpense - weekendExpense;

  // approx jours week-end vs semaine sur la période
  const weeks = Math.max(1, Math.floor(daySpan / 7));
  const weekendDays = Math.min(
    daySpan,
    weeks * 2 + (daySpan % 7 >= 6 ? 2 : daySpan % 7 >= 1 ? 1 : 0),
  );
  const weekdayDays = Math.max(1, daySpan - weekendDays);

  const avgWeekend = weekendExpense / Math.max(1, weekendDays);
  const avgWeekday = weekdayExpense / Math.max(1, weekdayDays);
  const deltaPct =
    avgWeekday === 0 ? 0 : ((avgWeekend - avgWeekday) / avgWeekday) * 100;

  const insightWeekend: AIInsight = {
    key: "WEEKEND_SPEND",
    title: "Dépenses week-end",
    observation:
      txCount < 10
        ? "Pas assez de données pour conclure sur tes habitudes week-end."
        : `Tu dépenses surtout le week-end (≈ ${deltaPct >= 0 ? "+" : ""}${Math.round(deltaPct)}% vs jours de semaine).`,
    recommendation:
      txCount < 10
        ? "Ajoute encore quelques transactions cette semaine pour que l’analyse devienne fiable."
        : "Fixe une enveloppe week-end (ex: 5 000–10 000 FCFA) et active une alerte quand tu atteins 70%.",
    confidence: confidenceFromData({
      txCount,
      daySpan,
      hasBudget: !!input?.monthlyBudgetTotal,
    }),
    impact: clamp(Math.round(Math.abs(deltaPct)), 10, 90),
    meta: { deltaPct: Math.round(deltaPct), avgWeekend, avgWeekday },
  };

  // ===== Insight B: “Top catégorie qui te coûte le plus” =====
  const byCat = new Map<number, number>();
  for (const e of expenses) {
    if (!e.category_id) continue;
    byCat.set(e.category_id, (byCat.get(e.category_id) ?? 0) + e.amount);
  }
  const topCat = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
  const topCatName = topCat
    ? (catsMap.get(topCat[0])?.name ?? "Catégorie")
    : "Aucune";
  const topCatSpend = topCat ? topCat[1] : 0;

  const sharePct = totalExpense === 0 ? 0 : (topCatSpend / totalExpense) * 100;

  const insightTopCat: AIInsight = {
    key: "TOP_CATEGORY",
    title: "Catégorie principale",
    observation: topCat
      ? `Ta catégorie #1 est **${topCatName}** : ${Math.round(sharePct)}% de tes dépenses sur ${lookbackDays} jours.`
      : "Je n’ai pas assez de dépenses catégorisées pour identifier ta catégorie #1.",
    recommendation: topCat
      ? `Réduis **${topCatName}** de 10% la semaine prochaine (petit défi) : ça libère du budget sans te frustrer.`
      : "Commence par choisir une catégorie pour chaque dépense (même simple).",
    confidence: confidenceFromData({ txCount, daySpan, hasBudget: false }),
    impact: clamp(Math.round(sharePct), 15, 95),
    meta: { topCatId: topCat?.[0] ?? null, topCatName, topCatSpend, sharePct },
  };

  // ===== Insight C: “Chaque dépense retarde ton MacBook de X jours” (si objectif) =====
  // Ici on fait un calcul “simple” : retard = dépense / vitesse d’épargne
  // vitesse d’épargne = moyenne (épargne nette/jour) estimée : (revenus - dépenses)/daySpan
  const netPerDay = (totalIncome - totalExpense) / Math.max(1, daySpan);
  const savingSpeed = Math.max(0, netPerDay); // si négatif => 0

  // Focus category (ex: loisirs)
  const focusCatId = input?.focusCategoryId ?? null;
  const focusSpend = focusCatId
    ? expenses
        .filter((t) => t.category_id === focusCatId)
        .reduce((s, t) => s + t.amount, 0)
    : 0;

  const delayDays =
    savingSpeed <= 0 ? null : Math.round(focusSpend / savingSpeed);

  const insightDelay: AIInsight = {
    key: "GOAL_DELAY",
    title: "Impact sur tes objectifs",
    observation: !focusCatId
      ? "Tu peux choisir une catégorie “à risque” (ex: Loisirs) pour mesurer son impact sur ton objectif."
      : savingSpeed <= 0
        ? `Sur ${lookbackDays} jours, ton épargne nette est faible (ou négative). Du coup tes dépenses te font perdre de l’avance.`
        : `Sur ${lookbackDays} jours, tes dépenses **${catsMap.get(focusCatId)?.name ?? "focus"}** peuvent retarder ton objectif d’environ **${delayDays} jours**.`,
    recommendation: !focusCatId
      ? "Choisis ta catégorie principale de “tentation” (Loisirs, Livraison, Abos) et je te calcule l’impact exact."
      : savingSpeed <= 0
        ? "Objectif mini : repasser en épargne nette positive (même +500 FCFA/jour). Commence par couper 1 dépense non essentielle."
        : `Défi : baisse cette catégorie de 15% pendant 2 semaines → tu récupères plusieurs jours d’avance.`,
    confidence: confidenceFromData({ txCount, daySpan, hasBudget: false }),
    impact: clamp(delayDays ?? 10, 10, 90),
    meta: { savingSpeed, focusSpend, delayDays, focusCatId },
  };

  const transactions = await listTransactions(200);
  const daysSpan = getDaySpanFromTransactions(transactions);

  const budgetInsight = await buildBudgetInsight({
    today: toYYYYMMDD(new Date()),
    txCount: transactions.length,
    daySpan: daysSpan,
  });

  // ===== Règle: on filtre les insights trop “vides” et on sort Top 3 =====
  const candidates = [
    insightWeekend,
    insightTopCat,
    insightDelay,
    ...(budgetInsight ? [budgetInsight] : []),
  ];

  // Score global = confiance * 0.6 + impact * 0.4
  const scored = candidates
    .map((x) => ({
      ...x,
      _score: x.confidence * 0.6 + x.impact * 0.4,
    }))
    .sort((a, b) => b._score - a._score);

  return scored.slice(0, 3).map(({ _score, ...rest }) => rest);
}

export async function buildBudgetInsight(params: {
  today?: string; // YYYY-MM-DD
  txCount: number;
  daySpan: number;
}): Promise<AIInsight | null> {
  const today = params.today ?? toYYYYMMDD(new Date());
  const d = new Date(today + "T00:00:00");
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  const rows = await getBudgetVsSpendForMonth(month, year);
  if (!rows || rows.length === 0) {
    return {
      key: "BUDGETS_EMPTY",
      title: "Budgets mensuels",
      observation: "Aucun budget n’est défini pour ce mois.",
      recommendation:
        "Crée au moins 1 budget (ex: Alimentation / Transport) pour activer les alertes et les recommandations.",
      confidence: confidenceFromData({
        txCount: params.txCount,
        daySpan: params.daySpan,
        hasBudget: false,
      }),
      impact: 35,
      meta: { month, year },
    };
  }

  const over = rows.filter((r) => r.ratio >= 1);
  const near = rows.filter((r) => r.ratio >= 0.8 && r.ratio < 1);

  // Priorité : dépassements, sinon proches
  const main = over[0] ?? near[0] ?? rows[0];

  const overNames = over.slice(0, 3).map((r) => r.category_name);
  const nearNames = near.slice(0, 3).map((r) => r.category_name);

  const observation =
    over.length > 0
      ? `Tu as dépassé ton budget sur **${over.length}** catégorie(s) : ${overNames.join(", ")}.`
      : near.length > 0
        ? `Attention : tu es proche du dépassement sur **${near.length}** catégorie(s) : ${nearNames.join(", ")}.`
        : `Bonne nouvelle : tu es dans les limites sur toutes tes catégories budgétées.`;

  const mainPct = Math.round(main.ratio * 100);
  const rec =
    over.length > 0
      ? `Stop “dégâts” : bloque les dépenses sur **${main.category_name}** 48h, et ajuste un plafond “reste du mois” (ex: ${Math.max(0, main.remaining)} FCFA).`
      : near.length > 0
        ? `Mode contrôle : limite **${main.category_name}** à ${Math.max(0, main.remaining)} FCFA jusqu’à la fin du mois (≈ ${mainPct}% déjà consommé).`
        : `Continue comme ça. Si tu veux booster l’épargne, réduis la catégorie #1 de 5–10%.`;

  const impact = clamp(
    over.length > 0 ? 85 : near.length > 0 ? 65 : 35,
    10,
    95,
  );

  return {
    key: "BUDGET_STATUS",
    title: "Budgets du mois",
    observation,
    recommendation: rec,
    confidence: confidenceFromData({
      txCount: params.txCount,
      daySpan: params.daySpan,
      hasBudget: true,
    }),
    impact,
    meta: {
      month,
      year,
      overCount: over.length,
      nearCount: near.length,
      top: rows.slice(0, 5),
    },
  };
}
