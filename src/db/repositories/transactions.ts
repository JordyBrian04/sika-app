import { COLORS } from "@/components/ui/color";
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
  category_name: string | null;
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
    `SELECT transactions.*, categories.name as category_name FROM transactions LEFT JOIN categories ON transactions.category_id = categories.id ORDER BY date DESC, id DESC LIMIT ?`,
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

export async function getPeriode() {
  return all(
    `SELECT DISTINCT strftime('%Y-%m', date) as periode FROM transactions ORDER BY periode DESC`,
  );
}

export async function getTransactionsByMonthYearAndCategory(
  month: number,
  year: number,
  categoryId: number,
) {
  return all<TransactionRow>(
    `SELECT transactions.*, categories.name FROM transactions LEFT JOIN categories ON transactions.category_id = categories.id WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ? AND category_id = ? ORDER BY date DESC, id DESC`,
    [month.toString().padStart(2, "0"), year.toString(), categoryId],
  );
}

export async function getLastSixMonthsSpendingByCategory(
  categoryId: number,
  month: number,
  year: number,
) {
  const barData = [];
  const monthNameShort = [
    "JAN",
    "FEV",
    "MAR",
    "AVR",
    "MAI",
    "JUI",
    "JUL",
    "AOU",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  for (let i = 5; i >= 0; i--) {
    const targetMonth = month - i;
    const targetYear = targetMonth <= 0 ? year - 1 : year;
    const adjustedMonth = ((targetMonth - 1 + 12) % 12) + 1; // Adjust month to be between 1 and 12
    const total = await getOne<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
        WHERE type = 'depense'
          AND strftime('%m', date) = ?
          AND strftime('%Y', date) = ?
          AND category_id = ?`,
      [
        adjustedMonth.toString().padStart(2, "0"),
        targetYear.toString(),
        categoryId,
      ],
    );

    const isCurrentMonth = adjustedMonth === month && targetYear === year;

    barData.push({
      label: monthNameShort[adjustedMonth - 1],
      value: total?.total ?? 0,
      frontColor: isCurrentMonth ? COLORS.primary : "#888888", // Highlight current month in a different color
    });
  }
  return barData;
}
