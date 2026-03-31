import { all, getOne, runSql } from "@/src/db/";
import { checkGoalCompleted, checkSavingBadges } from "@/src/services/badges/badgeService";
import { updateGoalStreakForWeek } from "@/src/services/goals/streak";
import { toYYYYMMDD, weekKey } from "@/src/utils/goalDates";
import { updateActivityAndStreak } from "../gamification/daily";
import { reward } from "../gamification/xpService";
import { onSaving } from "../missions/weekly";

export type GoalContribution = {
  id: number;
  goal_id: number;
  amount: number;
  date: string;
  note: string | null;
  source: "manual" | "roundup" | "auto";
};

export async function addContribution(input: {
  goal_id: number;
  amount: number;
  date?: string;
  note?: string | null;
  source?: GoalContribution["source"];
}) {
  const date = input.date ?? toYYYYMMDD(new Date());

  await runSql(
    `INSERT INTO goal_contributions (goal_id, amount, date, note, source)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.goal_id,
      input.amount,
      date,
      input.note ?? null,
      input.source ?? "manual",
    ],
  );

  const res = await getOne<{ min_weekly: number }>(
    `SELECT min_weekly as min_weekly FROM saving_goals WHERE id=? AND active=1 ORDER BY id DESC LIMIT 1`,
    [input.goal_id],
  );

  // update streak (si cette semaine on a ajouté >= min_weekly)
  await reward("ADD_SAVING", input.goal_id);
  await updateGoalStreakForWeek(input.goal_id, weekKey(new Date(date)));
  await updateActivityAndStreak();
  await onSaving(input.amount, res?.min_weekly ?? 0);

  // Badges épargne + vérification objectif atteint
  try {
    await checkSavingBadges();
    await checkGoalCompleted(input.goal_id);
  } catch (e) {
    console.warn("checkSavingBadges/checkGoalCompleted failed:", e);
  }
}

export async function listContributions(goal_id: number, limit = 50) {
  return all<GoalContribution>(
    `SELECT * FROM goal_contributions WHERE goal_id=? ORDER BY date DESC, id DESC LIMIT ?`,
    [goal_id, limit],
  );
}

export async function deleteGoalContribution(id: number) {
  await runSql(`DELETE FROM goal_contributions WHERE id=?`, [id]);
}

export async function deleteAllGoalContribution(id: number) {
  await runSql(`DELETE FROM goal_contributions WHERE goal_id=?`, [id]);
}

export async function getGoalSavedAmount(goal_id: number) {
  const row = await getOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM goal_contributions WHERE goal_id=?`,
    [goal_id],
  );
  return Number(row?.total ?? 0);
}
