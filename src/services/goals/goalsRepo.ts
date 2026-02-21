import { all, getOne, runSql } from "@/src/db";
import { toYYYYMMDD } from "@/src/utils/goalDates";

export type Goal = {
  id: number;
  name: string;
  target_amount: number;
  start_date: string;
  target_date: string;
  priority: "low" | "medium" | "high";
  min_weekly: number;
  active: 0 | 1;
};

export async function createGoal(input: {
  name: string;
  target_amount: number;
  target_date: string; // YYYY-MM-DD
  priority?: Goal["priority"];
  min_weekly?: number;
  start_date?: string;
}) {
  const start = input.start_date ?? toYYYYMMDD(new Date());
  await runSql(
    `INSERT INTO saving_goals (name, target_amount, start_date, target_date, priority, min_weekly)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.name.trim(),
      input.target_amount,
      start,
      input.target_date,
      input.priority ?? "medium",
      input.min_weekly ?? 0,
    ],
  );
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
}

export async function listGoals(activeOnly = true): Promise<Goal[]> {
  return all<Goal>(
    `SELECT * FROM saving_goals ${activeOnly ? "WHERE active=1" : ""} ORDER BY priority DESC, id DESC`,
  );
}

export async function getGoal(id: number): Promise<Goal | null> {
  return getOne<Goal>(`SELECT * FROM saving_goals WHERE id=?`, [id]);
}
