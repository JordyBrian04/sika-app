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

type TxRow = {
  id: number;
  amount: number;
  type: "depense" | "entree";
  date: string; // YYYY-MM-DD
  category_id: number | null;
};

type CatRow = { id: number; name: string; type: string };

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

export async function editTransaction(input: {
  amount: number;
  type: TransactionType;
  category_id?: number | null;
  date: string; // 'YYYY-MM-DD' recommended
  note?: string | null;
  recurring_id?: number | null;
  id: number;
}) {
  await runSql(
    `UPDATE transactions SET amount=?, type=?, category_id=?, date=?, note=?, recurring_id=?
     WHERE id=?`,
    [
      input.amount,
      input.type,
      input.category_id ?? null,
      input.date,
      input.note ?? null,
      input.recurring_id ?? null,
      input.id,
    ],
  );

  const transactionId = await getOne<{ id: number }>(
    `SELECT last_insert_rowid() as id;`,
  );

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

export async function getTxInRange(from: string, to: string) {
  return all<TxRow>(
    `
    SELECT id, amount, type, date, category_id
    FROM transactions
    WHERE date >= ? AND date <= ?
    ORDER BY date ASC
    `,
    [from, to],
  );
}

export async function getCategoriesMap() {
  const cats = await all<CatRow>(`SELECT id, name, type FROM categories`);
  const map = new Map<number, CatRow>();
  cats.forEach((c) => map.set(c.id, c));
  return map;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type BudgetVsSpendRow = {
  category_id: number;
  category_name: string;
  limit_amount: number;
  spent: number; // dépenses du mois
  remaining: number; // limit - spent
  ratio: number; // spent / limit (0..+)
};

export async function getBudgetVsSpendForMonth(month: number, year: number) {
  return all<BudgetVsSpendRow>(
    `
    SELECT
      b.category_id,
      c.name as category_name,
      b.limit_amount as limit_amount,
      COALESCE(SUM(t.amount), 0) as spent,
      (b.limit_amount - COALESCE(SUM(t.amount), 0)) as remaining,
      CASE
        WHEN b.limit_amount <= 0 THEN 0
        ELSE (COALESCE(SUM(t.amount), 0) * 1.0 / b.limit_amount)
      END as ratio
    FROM budgets b
    JOIN categories c ON c.id = b.category_id
    LEFT JOIN transactions t
      ON t.category_id = b.category_id
     AND t.type = 'depense'
     AND CAST(strftime('%m', t.date) AS INTEGER) = b.month
     AND CAST(strftime('%Y', t.date) AS INTEGER) = b.year
    WHERE b.month = ? AND b.year = ?
    GROUP BY b.category_id, c.name, b.limit_amount
    ORDER BY ratio DESC, spent DESC
    `,
    [month, year],
  );
}
