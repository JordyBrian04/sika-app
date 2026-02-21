import { getOne } from "@/src/db";
import { diffDays, parseISO, toYYYYMMDD } from "@/src/utils/goalDates";
import { getGoal } from "./goalsRepo";
import { getGoalPlan } from "./planner";

export async function getGoalSavingSpeed(goalId: number, lookbackDays = 42) {
  const row = await getOne<{ total: number }>(
    `
    SELECT COALESCE(SUM(amount), 0) as total
    FROM goal_contributions
    WHERE goal_id = ?
      AND date >= date('now', ?)
      AND date <= date('now')
    `,
    [goalId, `-${lookbackDays - 1} day`],
  );

  const total = Number(row?.total ?? 0);
  const dailyAvg = total / lookbackDays;
  const weeklyAvg = dailyAvg * 7;

  return {
    lookbackDays,
    total,
    dailyAvg,
    weeklyAvg,
  };
}

function addDaysISO(iso: string, days: number) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toYYYYMMDD(d);
}

export type GoalProjection = {
  projected_date: string | null; // null si vitesse=0
  days_needed: number | null;

  // comparaison avec la date cible
  delta_days_vs_target: number | null; // positif = en retard, négatif = en avance
  label: string; // "En avance de X jours" / "En retard de X jours" / "Stable"
};

export async function getGoalProjection(
  goalId: number,
  options?: { today?: string; lookbackDays?: number },
): Promise<GoalProjection> {
  const today = options?.today ?? toYYYYMMDD(new Date());
  const lookbackDays = options?.lookbackDays ?? 42;

  const plan = await getGoalPlan(goalId, today);
  const speed = await getGoalSavingSpeed(goalId, lookbackDays);

  // Si tu n'épargnes pas (dailyAvg=0) => pas de projection fiable
  if (speed.dailyAvg <= 0) {
    return {
      projected_date: null,
      days_needed: null,
      delta_days_vs_target: null,
      label: "Projection indisponible (aucune épargne récente).",
    };
  }

  const daysNeeded = Math.ceil(plan.remaining_amount / speed.dailyAvg);
  const projected = addDaysISO(today, daysNeeded);

  // delta vs target date
  const target = parseISO(
    plan.days_left === 0
      ? today
      : (await (await import("./goalsRepo")).getGoal(goalId))!.target_date,
  );
  // ↑ Si tu n'aimes pas cet import dynamique, lis la version propre plus bas

  const projectedDate = parseISO(projected);
  const delta = diffDays(projectedDate, target); // >0 = projection après target = retard

  let label = "Stable";
  if (delta > 0) label = `En retard de ${delta} jour(s)`;
  else if (delta < 0) label = `En avance de ${Math.abs(delta)} jour(s)`;

  return {
    projected_date: projected,
    days_needed: daysNeeded,
    delta_days_vs_target: delta,
    label,
  };
}

export async function getGoalProjectionClean(
  goalId: number,
  options?: { today?: string; lookbackDays?: number },
) {
  const today = options?.today ?? toYYYYMMDD(new Date());
  const lookbackDays = options?.lookbackDays ?? 42;

  const goal = await getGoal(goalId);
  if (!goal) throw new Error("Goal not found");

  const plan = await getGoalPlan(goalId, today);
  const speed = await getGoalSavingSpeed(goalId, lookbackDays);

  if (speed.dailyAvg <= 0) {
    return {
      projected_date: null,
      days_needed: null,
      delta_days_vs_target: null,
      label: "Projection indisponible (aucune épargne récente).",
    };
  }

  const daysNeeded = Math.ceil(plan.remaining_amount / speed.dailyAvg);
  const projected = addDaysISO(today, daysNeeded);

  const delta = diffDays(parseISO(projected), parseISO(goal.target_date));

  let label = "Stable";
  if (delta > 0) label = `En retard de ${delta} jour(s)`;
  else if (delta < 0) label = `En avance de ${Math.abs(delta)} jour(s)`;

  return {
    projected_date: projected,
    days_needed: daysNeeded,
    delta_days_vs_target: delta,
    label,
    speed, // utile pour l’UI
    plan,
  };
}

export async function getDelayDaysFromExpenseUsingPlan(
  goalId: number,
  expenseAmount: number,
  today = toYYYYMMDD(new Date()),
) {
  const plan = await getGoalPlan(goalId, today);

  // daily needed to stay on track
  const dailyNeeded = plan.recommended_weekly / 7;

  if (dailyNeeded <= 0) return 0;

  const delayDays = Math.ceil(expenseAmount / dailyNeeded);
  return delayDays; // ex: 2 jours
}

export async function getDelayDaysFromExpenseUsingRealSpeed(
  goalId: number,
  expenseAmount: number,
  lookbackDays = 42,
) {
  const speed = await getGoalSavingSpeed(goalId, lookbackDays);

  if (speed.dailyAvg <= 0) return null; // pas calculable

  const delayDays = Math.ceil(expenseAmount / speed.dailyAvg);
  return delayDays;
}
