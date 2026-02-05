import { checkTransactionBadges } from "@/src/services/badges/badgeService";
import { addXp } from "@/src/services/gamification/xpService";
import { all, getOne, runSql } from "../index";

export type TransactionType = "depense" | "entree";

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

  await checkTransactionBadges();

  // Add XP for adding a transaction
  const xpAmount = input.type === "depense" ? 5 : 10; // example: 10 XP for expenses, 5 XP for income
  await addXp(
    xpAmount,
    `Transaction ${input.type === "depense" ? "dépense" : "entrée"} ajoutée`,
  );
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
