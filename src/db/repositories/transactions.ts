import { checkTransactionBadges } from "@/src/services/badges/badgeService";
import {
  formatDateYYYYMMDD,
  updateDailyMissions,
  updateStreak,
} from "@/src/services/gamification/daily";
import { reward } from "@/src/services/gamification/xpService";
import { all, getOne, runSql } from "../index";

export type TransactionType = "depense" | "entree" | "event";

export type TransactionRow = {
  id: number;
  amount: number;
  type: TransactionType;
  category_id: number | null;
  date: string;
  note: string | null;
  recurring_id: number | null;
  created_at: string;
};

export async function addTransaction(input: {
  amount: number;
  type: TransactionType;
  category_id?: number | null;
  date: string; // 'YYYY-MM-DD' recommended
  note?: string | null;
  recurring_id?: number | null;
}) {
  await runSql(
    `INSERT INTO transactions (amount, type, category_id, date, note, recurring_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.amount,
      input.type,
      input.category_id ?? null,
      input.date,
      input.note ?? null,
      input.recurring_id ?? null,
    ],
  );

  const transactionId = await getOne<{ id: number }>(
    `SELECT last_insert_rowid() as id;`,
  );

  try {
    await checkTransactionBadges();
  } catch (e) {
    console.warn("checkTransactionBadges failed:", e);
  }

  // Add XP for adding a transaction
  // const xpAmount = input.type === "depense" ? 5 : 10; // example: 10 XP for expenses, 5 XP for income
  // await addXp(
  //   xpAmount,
  //   `Transaction ${input.type === "depense" ? "dépense" : "entrée"} ajoutée`,
  // );
  const today = formatDateYYYYMMDD(new Date());
  await updateStreak(today);

  try {
    if (input.type === "depense") {
      await reward("ADD_EXPENSE", transactionId?.id);
      await updateDailyMissions(today, "ADD_EXPENSE");
    } else {
      await reward("ADD_INCOME", transactionId?.id);
      await updateDailyMissions(today, "ADD_INCOME");
    }
  } catch (e) {
    console.warn("reward failed:", e);
  }

  return transactionId?.id;
}

export async function listTransactions(limit = 50): Promise<TransactionRow[]> {
  return all<TransactionRow>(
    `SELECT * FROM transactions ORDER BY date DESC, id DESC LIMIT ?`,
    [limit],
  );
}

export async function deleteTransaction(id: number) {
  await runSql(`DELETE FROM transactions WHERE id = ?`, [id]);
}

export async function sumByPeriod(params: {
  from: string; // 'YYYY-MM-DD'
  to: string; // 'YYYY-MM-DD'
  type: TransactionType;
}) {
  const row = await getOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE type = ?
       AND date >= ?
       AND date <= ?`,
    [params.type, params.from, params.to],
  );
  return row?.total ?? 0;
}
