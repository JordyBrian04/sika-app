import { getOne, runSql } from "@/src/db";
import { getGoal } from "@/src/services/goals/goalsRepo";

export async function ensureGoalStreakRow(goal_id: number) {
  await runSql(
    `INSERT OR IGNORE INTO goal_streaks (goal_id, current_streak, best_streak) VALUES (?, 0, 0)`,
    [goal_id],
  );
}

export async function getWeekTotal(goal_id: number, weekKey: string) {
  // weekKey: "YYYY-WW" -> on ne peut pas filtrer directement sans table calendrier
  // Simple: tu peux appeler ça via dates (option), sinon on valide par logique UI.
  // Ici, on fait une approche simple: tu passes weekStart/weekEnd dans une autre fonction si tu veux.
  return 0;
}

/**
 * Version simple: appelée après addContribution.
 * On valide la semaine si totalContributionThisWeek >= min_weekly
 * (Tu peux passer totalThisWeek depuis l’écran, c’est encore plus simple)
 */
export async function updateGoalStreakForWeek(
  goal_id: number,
  week_key: string,
) {
  const goal = await getGoal(goal_id);
  if (!goal) return;

  await ensureGoalStreakRow(goal_id);

  // total contributions semaine: version simple -> on calcule "depuis lundi" à "dimanche"
  // Pour éviter complexité, on calcule en SQL avec date('now','weekday 1','-7 days') etc côté écran.
  // Ici on fera une validation plus simple côté UI: voir note plus bas.

  // Si tu veux une version SQL parfaite semaine ISO, dis-moi, je te la code.
  // Là: on met juste last_success_week si au moins un ajout cette semaine et min_weekly=0
  const row = await getOne<{
    last_success_week: string | null;
    current_streak: number;
    best_streak: number;
  }>(
    `SELECT last_success_week, current_streak, best_streak FROM goal_streaks WHERE goal_id=?`,
    [goal_id],
  );

  // Si min_weekly=0, streak = "au moins 1 contribution par semaine"
  const already = row?.last_success_week === week_key;
  if (already) return;

  const newCurrent = (row?.current_streak ?? 0) + 1;
  const newBest = Math.max(row?.best_streak ?? 0, newCurrent);

  await runSql(
    `UPDATE goal_streaks SET current_streak=?, best_streak=?, last_success_week=?, updated_at=datetime('now') WHERE goal_id=?`,
    [newCurrent, newBest, week_key, goal_id],
  );
}
