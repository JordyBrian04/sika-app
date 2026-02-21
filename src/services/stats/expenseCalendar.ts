// adapte: ta fonction all<T>(sql, params)
import { all } from "@/src/db";

export type ExpenseDay = {
  date: string; // "YYYY-MM-DD"
  amount: number; // total dépensé ce jour
};

function buildLastNDays(n: number, today = new Date()) {
  const days: string[] = [];
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);

  // On construit du plus ancien au plus récent
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);

    const yyyy = x.getFullYear();
    const mm = String(x.getMonth() + 1).padStart(2, "0");
    const dd = String(x.getDate()).padStart(2, "0");
    days.push(`${yyyy}-${mm}-${dd}`);
  }
  return days;
}

export async function getExpenseCalendar60Days(): Promise<ExpenseDay[]> {
  // Totaux par jour sur les 60 derniers jours
  const rows = await all<{ date: string; amount: number }>(
    `
    SELECT date as date, SUM(amount) as amount
    FROM transactions
    WHERE type='depense'
      AND date >= date('now', '-59 day')
      AND date <= date('now')
    GROUP BY date
    ORDER BY date ASC
    `,
  );

  // On veut retourner 60 jours même si certains jours = 0
  const last60 = buildLastNDays(60);
  const map = new Map(rows.map((r) => [r.date, Number(r.amount ?? 0)]));

  return last60.map((date) => ({
    date,
    amount: map.get(date) ?? 0,
  }));
}
