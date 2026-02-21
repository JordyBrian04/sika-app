import { all, getOne, runSql } from "@/src/db/";
import { updateGoalStreakForWeek } from "@/src/services/goals/streak";
import { toYYYYMMDD, weekKey } from "@/src/utils/goalDates";

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

  // update streak (si cette semaine on a ajouté >= min_weekly)
  await updateGoalStreakForWeek(input.goal_id, weekKey(new Date(date)));
}

export async function listContributions(goal_id: number, limit = 50) {
  return all<GoalContribution>(
    `SELECT * FROM goal_contributions WHERE goal_id=? ORDER BY date DESC, id DESC LIMIT ?`,
    [goal_id, limit],
  );
}

export async function getGoalSavedAmount(goal_id: number) {
  const row = await getOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM goal_contributions WHERE goal_id=?`,
    [goal_id],
  );
  return Number(row?.total ?? 0);
}
