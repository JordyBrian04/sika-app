import { all, getOne, runSql } from "@/src/db";
import { checkGoalBadges } from "@/src/services/badges/badgeService";
import { toYYYYMMDD } from "@/src/utils/goalDates";
import { reward } from "../gamification/xpService";
import { deleteGoalContribution } from "./contributions";

export type Goal = {
  id: number;
  name: string;
  target_amount: number;
  start_date: string;
  target_date: string;
  priority: "low" | "medium" | "high";
  min_weekly: number;
  active: 0 | 1;
  frequence?: "daily" | "weekly" | "monthly"; // pour calcul auto des contributions
};

export async function createGoal(input: {
  name: string;
  target_amount: number;
  target_date: string; // YYYY-MM-DD
  priority?: Goal["priority"];
  min_weekly?: number;
  start_date?: string;
  frequence?: Goal["frequence"];
}) {
  const start = input.start_date ?? toYYYYMMDD(new Date());
  await runSql(
    `INSERT INTO saving_goals (name, target_amount, start_date, target_date, priority, min_weekly, frequence)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name.trim(),
      input.target_amount,
      start,
      input.target_date,
      input.priority ?? "medium",
      input.min_weekly ?? 0,
      input.frequence ?? "weekly",
    ],
  );

  const res = await getOne<{ id: number }>(
    `SELECT id FROM saving_goals WHERE name=? AND target_amount=? AND start_date=? AND target_date=? ORDER BY id DESC LIMIT 1`,
    [input.name.trim(), input.target_amount, start, input.target_date],
  );

  await reward("CREATE_GOAL", res?.id);

  try {
    await checkGoalBadges();
  } catch (e) {
    console.warn("checkGoalBadges failed:", e);
  }

  return res ? res.id : 0;
}

export async function updateGoal(id: number, patch: Partial<Omit<Goal, "id">>) {
  const fields = Object.keys(patch);
  if (fields.length === 0) return;

  const setSql = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => (patch as any)[f]);

  await runSql(`UPDATE saving_goals SET ${setSql} WHERE id = ?`, [
    ...values,
    id,
  ]);
}

export async function deleteGoal(id: number) {
  await runSql(`DELETE FROM saving_goals WHERE id = ?`, [id]);

  await deleteGoalContribution(id); // Supprimer les contributions associées
}

export async function listGoals(activeOnly = true): Promise<Goal[]> {
  return all<Goal>(
    `SELECT * FROM saving_goals ${activeOnly ? "WHERE active=1" : ""} ORDER BY priority DESC, id DESC`,
  );
}

export async function getGoal(id: number): Promise<Goal | null> {
  return getOne<Goal>(`SELECT * FROM saving_goals WHERE id=?`, [id]);
}

export async function getMinWeekly(): Promise<number> {
  const res = await getOne<Goal>(
    `SELECT AVG(min_weekly) as min_weekly FROM saving_goals WHERE active=1 ORDER BY id DESC LIMIT 1`,
  );

  return res?.min_weekly ? Math.ceil(res.min_weekly) : 0;
}

export async function weeklyHistory(
  goalId: number,
): Promise<{ weekStart: string; amount: number }[]> {
  return all<{ weekStart: string; amount: number }>(
    `SELECT 
      sg.name,
      CAST(((julianday(gc.date) - julianday(sg.start_date)) / 7) AS INTEGER) + 1 AS week_num,
      SUM(gc.amount) AS weekly_sum
    FROM goal_contributions gc
    JOIN saving_goals sg ON gc.goal_id = sg.id
    WHERE gc.goal_id = ?
    GROUP BY sg.id, week_num
    ORDER BY week_num DESC`,
    [goalId],
  );
}
