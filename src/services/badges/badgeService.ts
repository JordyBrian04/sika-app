import { useToastStore } from "@/src/state/toastStore";
import { all, getOne, runSql } from "../../db";

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

  // toast
  useToastStore
    .getState()
    .show(`Nouveau badge : ${badge.title}`, badge.description, "badge");
}

export async function checkTransactionBadges() {
  const total = await getOne<{ c: number }>(
    "SELECT COUNT(*) as c FROM transactions",
  );

  if ((total?.c ?? 0) >= 1) unlockBadge("FIRST_TX");
  if ((total?.c ?? 0) >= 10) unlockBadge("TEN_TX");
  if ((total?.c ?? 0) >= 50) unlockBadge("FIFTY_TX");
  if ((total?.c ?? 0) >= 100) unlockBadge("HUNDRED_TX");

  const expense = await getOne<{ c: number }>(
    "SELECT COUNT(*) as c FROM transactions WHERE type='depense'",
  );

  if ((expense?.c ?? 0) >= 1) unlockBadge("FIRST_EXPENSE");

  const income = await getOne<{ c: number }>(
    "SELECT COUNT(*) as c FROM transactions WHERE type='entree'",
  );

  if ((income?.c ?? 0) >= 1) unlockBadge("FIRST_INCOME");
}

export async function checkBudgetBadges() {
  unlockBadge("FIRST_BUDGET");
}

export async function checkSavingBadges(totalSaved: number) {
  unlockBadge("SAVE_START");

  if (totalSaved >= 50000) unlockBadge("SAVE_50K");
  if (totalSaved >= 100000) unlockBadge("SAVE_100K");
}

export async function checkGoalCompleted() {
  unlockBadge("GOAL_DONE");
}

export async function checkRecurringBadges(count: number) {
  unlockBadge("RECURRING_CREATED");
  if (count >= 3) unlockBadge("BILLS_TRACKED");
}

export async function getUserBadges() {
  return all(`
    SELECT b.*
    FROM user_badges ub
    JOIN badges b ON b.id = ub.badge_id
    ORDER BY ub.earned_at DESC
  `);
}
