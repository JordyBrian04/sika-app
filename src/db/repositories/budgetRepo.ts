import { checkBudgetBadges } from "@/src/services/badges/badgeService";
import {
  formatDateYYYYMMDD,
  updateDailyMissions,
} from "@/src/services/gamification/daily";
import { reward } from "@/src/services/gamification/xpService";
import { all, getOne, runSql } from "../index";

export async function getCategoryMonthlyExpense(month: number) {
  const currentYear = new Date().getFullYear();
  const rows = await all<{
    id: number;
    category_id: number;
    category_name: string;
    monthly_limit: number;
    total_spent: number;
  }>(
    `SELECT
        b.id,
        b.category_id,
        b.limit_amount as monthly_limit,
        c.name as category_name,
        COALESCE(SUM(t.amount), 0) as total_spent
     FROM budgets b
     LEFT JOIN categories c ON b.category_id = c.id
     LEFT JOIN transactions t ON c.id = t.category_id AND t.type = 'depense' AND strftime('%m', t.date) = ? AND strftime('%Y', t.date) = ?
     WHERE b.month = ? AND b.year = ?
     GROUP BY b.category_id, c.name`,
    [
      month.toString().padStart(2, "0"),
      currentYear.toString(),
      month.toString().padStart(2, "0"),
      currentYear.toString(),
    ],
  );

  return rows.map((row) => ({
    id: row.id,
    month: month,
    year: currentYear,
    categoryId: row.category_id,
    categoryName: row.category_name,
    monthlyLimit: row.monthly_limit ?? 0,
    totalSpent: row.total_spent ?? 0,
    remaining: Math.max((row.monthly_limit ?? 0) - (row.total_spent ?? 0), 0),
    percentageUsed:
      (row.monthly_limit ?? 0) > 0
        ? ((row.total_spent ?? 0) / (row.monthly_limit ?? 0)) * 100
        : 0,
  }));
}

export async function addBudget(
  month: number,
  year: number,
  categoryId: number,
  limitAmount: number,
) {
  await runSql(
    `INSERT INTO budgets (month, year, category_id, limit_amount) VALUES (?, ?, ?, ?)
     ON CONFLICT(month, year, category_id) DO UPDATE SET limit_amount=excluded.limit_amount, created_at=datetime('now')`,
    [month, year, categoryId, limitAmount],
  );

  const budgetId = await getOne<{ id: number }>(
    `SELECT last_insert_rowid() as id;`,
  );

  try {
    await checkBudgetBadges();
  } catch (e) {
    console.warn("checkBudgetBadges failed:", e);
  }

  try {
    await reward("CREATE_BUDGET", budgetId?.id);
    const today = formatDateYYYYMMDD(new Date());
    await updateDailyMissions(today, "CREATE_BUDGET");
  } catch (error) {
    console.warn("Reward or daily mission update failed:", error);
  }
}

export async function deleteBudget(id: number) {
  await runSql(`DELETE FROM budgets WHERE id = ?`, [id]);
}

export async function editBudget(
  id: number,
  month: number,
  year: number,
  categoryId: number,
  limitAmount: number,
) {
  await runSql(
    `UPDATE budgets SET month = ?, year = ?, category_id = ?, limit_amount = ?, created_at = datetime('now') WHERE id = ?`,
    [month, year, categoryId, limitAmount, id],
  );
}

export async function getBudgetDetailByID(id: number) {
  console.log("Getting budget detail for ID:", id);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // getMonth() returns 0-11

  const rows = await all<{
    category_id: number;
    category_name: string;
    monthly_limit: number;
    total_spent: number;
  }>(
    `SELECT
        b.id,
        b.category_id,
        b.limit_amount as monthly_limit,
        c.name as category_name,
        COALESCE(SUM(t.amount), 0) as total_spent
     FROM budgets b
     LEFT JOIN categories c ON b.category_id = c.id
     LEFT JOIN transactions t ON c.id = t.category_id AND t.type = 'depense' AND strftime('%m', t.date) = ? AND strftime('%Y', t.date) = ?
     WHERE b.id = ?
     GROUP BY b.category_id, c.name`,
    [currentMonth.toString().padStart(2, "0"), currentYear.toString(), id],
  );

  return rows.map((row) => ({
    id: id,
    // month: month,
    // year: currentYear,
    categoryId: row.category_id,
    categoryName: row.category_name,
    monthlyLimit: row.monthly_limit ?? 0,
    totalSpent: row.total_spent ?? 0,
    remaining: Math.max((row.monthly_limit ?? 0) - (row.total_spent ?? 0), 0),
    percentageUsed:
      (row.monthly_limit ?? 0) > 0
        ? ((row.total_spent ?? 0) / (row.monthly_limit ?? 0)) * 100
        : 0,
  }));
}
