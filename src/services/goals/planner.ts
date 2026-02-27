import { getGoalSavedAmount } from "@/src/services/goals/contributions";
import { getGoal } from "@/src/services/goals/goalsRepo";
import { addDays } from "@/src/utils/date";
import { formatMoney } from "@/src/utils/format";
import { diffDays, parseISO, toYYYYMMDD } from "@/src/utils/goalDates";

export type GoalPlan = {
  goal_id: number;
  target_amount: number;
  saved_amount: number;
  remaining_amount: number;

  days_left: number;
  weeks_left: number;

  recommended_weekly: number;
  recommended_monthly: number;
  recommended_daily: number;

  status: "ahead" | "on_track" | "behind";
  message: string;

  projected_date?: string;
  weeklyRate: number;
};

function ceilDiv(a: number, b: number) {
  return Math.ceil(a / Math.max(b, 1));
}

export async function getGoalPlan(
  goalId: number,
  todayStr = toYYYYMMDD(new Date()),
): Promise<GoalPlan> {
  const goal = await getGoal(goalId);
  if (!goal) throw new Error("Goal not found");

  const saved = await getGoalSavedAmount(goalId);

  const frequence = goal.frequence || "weekly"; // default to weekly if not set

  const today = parseISO(todayStr);
  const target = parseISO(goal.target_date);

  const daysLeft = Math.max(diffDays(target, today), 0);
  const weeksLeft = Math.max(Math.ceil(daysLeft / 7), 1);
  const monthLeft = Math.max(Math.ceil(weeksLeft / 4), 1);

  const remaining = Math.max(goal.target_amount - saved, 0);

  let dailyPlannedRate = 0;

  // On calcule la vitesse par JOUR selon la fréquence
  if (frequence === "daily") {
    dailyPlannedRate = goal.min_weekly; // Ici min_weekly est déjà un montant par jour
  } else if (frequence === "monthly") {
    dailyPlannedRate = goal.min_weekly / 30; // On estime un mois à 30 jours
  } else {
    dailyPlannedRate = goal.min_weekly / 7; // Hebdomadaire
  }

  const daysElapsed = Math.max(diffDays(today, parseISO(goal.start_date)), 1);
  const weeklyElapsed = Math.max(Math.ceil(daysElapsed / 7), 1);
  // console.log("daysElapsed ", daysElapsed);
  // console.log("weeklyElapsed ", weeklyElapsed);
  const dailyRate = saved / daysElapsed; // Combien il épargne par jour en moyenne
  const weeklyRate = saved / weeklyElapsed; // Combien il épargne par semaine en moyenne
  // console.log("dailyRate", dailyRate);
  // console.log("weeklyRate", weeklyRate);

  let projectedDate: string | undefined;

  if (remaining > 0) {
    // Si l'utilisateur épargne déjà, on projette selon son rythme
    if (dailyRate > 0) {
      const daysToFinish = Math.ceil(remaining / dailyRate);
      projectedDate = toYYYYMMDD(addDays(today, daysToFinish));
    } else if (goal.min_weekly > 0) {
      // S'il n'a pas encore commencé, on projette selon son engagement (min_weekly)
      const weeklyRate = goal.min_weekly;
      const daysToFinish = Math.ceil(remaining / dailyPlannedRate);
      projectedDate = toYYYYMMDD(addDays(today, daysToFinish));
    }
  }

  if (daysLeft <= 0) {
    const isCompleted = remaining <= 0;
    return {
      goal_id: goalId,
      target_amount: goal.target_amount,
      saved_amount: saved,
      remaining_amount: remaining,
      days_left: 0,
      weeks_left: 0,
      recommended_daily: 0,
      recommended_weekly: 0,
      recommended_monthly: 0,
      status: isCompleted ? "ahead" : "behind",
      message: isCompleted
        ? "Félicitations ! Objectif atteint à temps. 🎉"
        : `Date limite dépassée. Il te manque encore ${formatMoney(remaining.toLocaleString())} FCFA.`,
      projected_date: isCompleted ? goal.target_date : undefined,
      weeklyRate: weeklyRate,
    };
  }

  const recWeekly = ceilDiv(remaining, weeksLeft);
  const recMonthly = ceilDiv(remaining, monthLeft);
  const recDaily = ceilDiv(remaining, Math.max(daysLeft, 1));

  // statut simple basé sur min_weekly
  let status: GoalPlan["status"] = "on_track";
  let message = "Tu es sur la bonne voie.";

  let currentEffort = recWeekly;
  let plannedEffort = goal.min_weekly;

  if (frequence === "daily") {
    currentEffort = recDaily;
  } else if (frequence === "monthly") {
    currentEffort = recMonthly;
  }

  if (goal.min_weekly > 0) {
    if (currentEffort > goal.min_weekly * 1.3) {
      status = "behind";
      message = `Tu es en retard. Pour rattraper, vise ~${formatMoney(currentEffort as any)} FCFA/${frequence === "daily" ? "jour" : frequence === "monthly" ? "mois" : "semaine"}.`;
    } else if (currentEffort < goal.min_weekly * 0.8) {
      status = "ahead";
      message = `Tu es en avance. Continue comme ça !`;
    }
  } else {
    message = `Recommandé: ~${formatMoney(currentEffort as any)} FCFA/${frequence === "daily" ? "jour" : frequence === "monthly" ? "mois" : "semaine"}.`;
  }

  return {
    goal_id: goalId,
    target_amount: goal.target_amount,
    saved_amount: saved,
    remaining_amount: remaining,
    days_left: daysLeft,
    weeks_left: weeksLeft,
    recommended_daily: recDaily,
    recommended_weekly: recWeekly,
    recommended_monthly: recMonthly,
    status,
    message,
    projected_date: projectedDate,
    weeklyRate: weeklyRate,
  };
}
