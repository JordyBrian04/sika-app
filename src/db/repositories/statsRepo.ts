import { all, getOne } from "../index";

export async function dayWithMostExpense(from: string, to: string) {
  return getOne<{ day: string; total: number }>(
    `SELECT date as day, SUM(amount) as total
     FROM transactions
     WHERE type = 'depense' AND date >= ? AND date <= ?
     GROUP BY date
     ORDER BY total DESC
     LIMIT 1`,
    [from, to],
  );
}

export async function dayWithLeastExpense(from: string, to: string) {
  return getOne<{ day: string; total: number }>(
    `SELECT date as day, SUM(amount) as total
     FROM transactions
     WHERE type = 'depense' AND date >= ? AND date <= ?
     GROUP BY date
     ORDER BY total ASC
     LIMIT 1`,
    [from, to],
  );
}

export async function totalsPerDay(from: string, to: string) {
  return all<{ day: string; depense: number; entree: number }>(
    `
    SELECT
      d.day as day,
      COALESCE(e.total, 0) as depense,
      COALESCE(i.total, 0) as entree
    FROM (
      SELECT date as day
      FROM transactions
      WHERE date >= ? AND date <= ?
      GROUP BY date
    ) d
    LEFT JOIN (
      SELECT date, SUM(amount) as total
      FROM transactions
      WHERE type='depense' AND date >= ? AND date <= ?
      GROUP BY date
    ) e ON e.date = d.day
    LEFT JOIN (
      SELECT date, SUM(amount) as total
      FROM transactions
      WHERE type='entree' AND date >= ? AND date <= ?
      GROUP BY date
    ) i ON i.date = d.day
    ORDER BY d.day ASC
    `,
    [from, to, from, to, from, to],
  );
}
