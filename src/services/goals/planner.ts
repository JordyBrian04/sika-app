import { getGoalSavedAmount } from "@/src/services/goals/contributions";
import { getGoal } from "@/src/services/goals/goalsRepo";
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

  status: "ahead" | "on_track" | "behind";
  message: string;
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

  const today = parseISO(todayStr);
  const target = parseISO(goal.target_date);

  const daysLeft = Math.max(diffDays(target, today), 0);
  const weeksLeft = Math.max(Math.ceil(daysLeft / 7), 1);

  const remaining = Math.max(goal.target_amount - saved, 0);

  const recWeekly = ceilDiv(remaining, weeksLeft);
  const recMonthly = recWeekly * 4;

  // statut simple basé sur min_weekly
  let status: GoalPlan["status"] = "on_track";
  let message = "Tu es sur la bonne voie.";

  if (goal.min_weekly > 0) {
    if (recWeekly > goal.min_weekly * 1.3) {
      status = "behind";
      message = `Tu es en retard. Pour rattraper, vise ~${recWeekly} FCFA/semaine.`;
    } else if (recWeekly < goal.min_weekly * 0.8) {
      status = "ahead";
      message = `Tu es en avance. Continue comme ça !`;
    }
  } else {
    message = `Recommandé: ~${recWeekly} FCFA/semaine.`;
  }

  return {
    goal_id: goalId,
    target_amount: goal.target_amount,
    saved_amount: saved,
    remaining_amount: remaining,
    days_left: daysLeft,
    weeks_left: weeksLeft,
    recommended_weekly: recWeekly,
    recommended_monthly: recMonthly,
    status,
    message,
  };
}
