import { useToastStore } from "@/src/state/toastStore";
import { all, getOne, runSql } from "../../db";

// ─── Utilitaires internes ────────────────────────────────────────

async function isAlreadyEarned(badgeId: number) {
  const row = await getOne<{ id: number }>(
    "SELECT id FROM user_badges WHERE badge_id = ?",
    [badgeId],
  );
  return !!row;
}

async function unlockBadge(code: string) {
  const badge = await getOne<{
    id: number;
    title: string;
    description: string;
  }>("SELECT id, title, description FROM badges WHERE code = ?", [code]);
  if (!badge) return;

  const already = await isAlreadyEarned(badge.id);
  if (already) return;

  await runSql(`INSERT INTO user_badges (badge_id) VALUES (?)`, [badge.id]);

  useToastStore
    .getState()
    .show(`Nouveau badge : ${badge.title}`, badge.description, "badge");
}

// ─── 1. Badges de transactions ───────────────────────────────────
export async function checkTransactionBadges() {
  const row = await getOne<{
    total: number;
    expenses: number;
    incomes: number;
  }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN type='depense' THEN 1 ELSE 0 END) as expenses,
       SUM(CASE WHEN type='entree'  THEN 1 ELSE 0 END) as incomes
     FROM transactions`,
  );

  const total = row?.total ?? 0;
  const expenses = row?.expenses ?? 0;
  const incomes = row?.incomes ?? 0;

  if (total >= 1) await unlockBadge("FIRST_TX");
  if (total >= 10) await unlockBadge("TEN_TX");
  if (total >= 50) await unlockBadge("FIFTY_TX");
  if (total >= 100) await unlockBadge("HUNDRED_TX");

  if (expenses >= 1) await unlockBadge("FIRST_EXPENSE");
  if (incomes >= 1) await unlockBadge("FIRST_INCOME");
}

// ─── 2. Badges de budget ─────────────────────────────────────────
export async function checkBudgetBadges() {
  await unlockBadge("FIRST_BUDGET");
}

// ─── 3. Badges d'épargne ─────────────────────────────────────────
export async function checkSavingBadges() {
  const row = await getOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM goal_contributions`,
  );
  const totalSaved = row?.total ?? 0;

  if (totalSaved > 0) await unlockBadge("SAVE_START");
  if (totalSaved >= 50000) await unlockBadge("SAVE_50K");
  if (totalSaved >= 100000) await unlockBadge("SAVE_100K");
}

// ─── 4. Badge premier objectif ───────────────────────────────────
export async function checkGoalBadges() {
  await unlockBadge("FIRST_GOAL");
}

// ─── 5. Badge objectif atteint ───────────────────────────────────
export async function checkGoalCompleted(goalId: number) {
  const goal = await getOne<{ target_amount: number }>(
    `SELECT target_amount FROM saving_goals WHERE id = ?`,
    [goalId],
  );
  if (!goal) return;

  const saved = await getOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM goal_contributions WHERE goal_id = ?`,
    [goalId],
  );

  if ((saved?.total ?? 0) >= goal.target_amount) {
    await unlockBadge("GOAL_DONE");
  }
}

// ─── 6. Badge journée sans dépense ──────────────────────────────
export async function checkNoSpendDayBadge() {
  await unlockBadge("NO_SPEND_DAY");
}

// ─── 7. Badges de paiements récurrents ───────────────────────────
export async function checkRecurringBadges() {
  const row = await getOne<{ c: number }>(
    `SELECT COUNT(*) as c FROM recurring_payments WHERE active = 1`,
  );
  const count = row?.c ?? 0;

  if (count >= 1) await unlockBadge("RECURRING_CREATED");
  if (count >= 3) await unlockBadge("BILLS_TRACKED");
}

// ─── 8. Badges de contrôle budgétaire ────────────────────────────
export async function checkBudgetControlBadges() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const overBudget = await getOne<{ c: number }>(
    `SELECT COUNT(*) as c
     FROM budgets b
     LEFT JOIN (
       SELECT category_id, SUM(amount) as spent
       FROM transactions
       WHERE type = 'depense'
         AND CAST(strftime('%m', date) AS INTEGER) = ?
         AND CAST(strftime('%Y', date) AS INTEGER) = ?
       GROUP BY category_id
     ) t ON t.category_id = b.category_id
     WHERE b.month = ? AND b.year = ?
       AND COALESCE(t.spent, 0) > b.limit_amount`,
    [lastMonth, lastMonthYear, lastMonth, lastMonthYear],
  );

  const hasBudgets = await getOne<{ c: number }>(
    `SELECT COUNT(*) as c FROM budgets WHERE month = ? AND year = ?`,
    [lastMonth, lastMonthYear],
  );

  if ((hasBudgets?.c ?? 0) > 0 && (overBudget?.c ?? 0) === 0) {
    await unlockBadge("MONTH_CONTROL");

    const weekOver = await getOne<{ c: number }>(
      `SELECT COUNT(*) as c
       FROM budgets b
       LEFT JOIN (
         SELECT category_id, SUM(amount) as spent
         FROM transactions
         WHERE type = 'depense'
           AND date >= date('now', '-7 days')
         GROUP BY category_id
       ) t ON t.category_id = b.category_id
       WHERE b.month = ? AND b.year = ?
         AND COALESCE(t.spent, 0) > b.limit_amount`,
      [currentMonth, currentYear],
    );

    if ((weekOver?.c ?? 0) === 0) {
      await unlockBadge("WEEK_CONTROL");
    }

    let consecutiveMonths = 0;
    for (let i = 1; i <= 3; i++) {
      let checkMonth = currentMonth - i;
      let checkYear = currentYear;
      if (checkMonth <= 0) {
        checkMonth += 12;
        checkYear -= 1;
      }

      const monthBudgets = await getOne<{ c: number }>(
        `SELECT COUNT(*) as c FROM budgets WHERE month = ? AND year = ?`,
        [checkMonth, checkYear],
      );
      if ((monthBudgets?.c ?? 0) === 0) break;

      const monthOver = await getOne<{ c: number }>(
        `SELECT COUNT(*) as c
         FROM budgets b
         LEFT JOIN (
           SELECT category_id, SUM(amount) as spent
           FROM transactions
           WHERE type = 'depense'
             AND CAST(strftime('%m', date) AS INTEGER) = ?
             AND CAST(strftime('%Y', date) AS INTEGER) = ?
           GROUP BY category_id
         ) t ON t.category_id = b.category_id
         WHERE b.month = ? AND b.year = ?
           AND COALESCE(t.spent, 0) > b.limit_amount`,
        [checkMonth, checkYear, checkMonth, checkYear],
      );

      if ((monthOver?.c ?? 0) === 0) {
        consecutiveMonths++;
      } else {
        break;
      }
    }

    if (consecutiveMonths >= 3) {
      await unlockBadge("THREE_MONTHS");
    }
  }
}

// ─── Lecture des badges ──────────────────────────────────────────

export async function getUserBadges() {
  return all(`
    SELECT b.*
    FROM user_badges ub
    JOIN badges b ON b.id = ub.badge_id
    ORDER BY ub.earned_at DESC
  `);
}
