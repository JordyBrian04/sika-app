import { all } from "../index";

export type DaySpend = {
  day: string; // 'YYYY-MM-DD'
  total: number; // total expense
};

export async function getExpenseLastDays(days = 60): Promise<DaySpend[]> {
  return all<DaySpend>(
    `
    SELECT date as day, COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE type='depense'
      AND date >= date('now', ?)
    GROUP BY date
    ORDER BY date ASC
    `,
    [`-${days} day`],
  );
}
