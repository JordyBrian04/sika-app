import { all } from "../../db";
import { computeNextDate, toYYYYMMDD } from "../../utils/date";

type RecurringRow = {
  id: number;
  name: string;
  amount: number;
  category_id: number | null;
  frequency: "semaine" | "mensuel" | "annuel" | "personnalisé";
  interval_count: number;
  next_date: string;
  active: number;
};

function monthRange(year: number, month1to12: number) {
  const start = new Date(year, month1to12 - 1, 1);
  const end = new Date(year, month1to12, 0); // dernier jour
  return { startYYYY: toYYYYMMDD(start), endYYYY: toYYYYMMDD(end) };
}

export async function getMonthlyRecurringPlan(
  year: number,
  month1to12: number,
) {
  const { startYYYY, endYYYY } = monthRange(year, month1to12);

  // 1) Déjà payé ce mois (transactions liées au recurring)
  const paid = await all<{
    recurring_id: number;
    category_id: number | null;
    total_paid: number;
  }>(
    `
    SELECT recurring_id, category_id, COALESCE(SUM(amount),0) AS total_paid
    FROM transactions
    WHERE recurring_id IS NOT NULL
      AND date BETWEEN ? AND ?
      AND type='depense'
    GROUP BY recurring_id, category_id
    `,
    [startYYYY, endYYYY],
  );

  const paidByCategory = new Map<number | null, number>();
  for (const p of paid) {
    paidByCategory.set(
      p.category_id,
      (paidByCategory.get(p.category_id) ?? 0) + p.total_paid,
    );
  }

  // 2) Occurrences à venir dans le mois (à partir de next_date)
  const recurrences = await all<RecurringRow>(
    `SELECT * FROM recurring_payments WHERE active=1`,
  );

  const plannedByCategory = new Map<number | null, number>();
  const plannedItems: Array<{
    recurring_id: number;
    name: string;
    due_date: string;
    amount: number;
    category_id: number | null;
  }> = [];

  for (const r of recurrences) {
    let d = r.next_date;

    // on génère toutes les occurrences dans la fenêtre du mois
    let guard = 0;
    while (d <= endYYYY && guard < 200) {
      if (d >= startYYYY) {
        plannedByCategory.set(
          r.category_id,
          (plannedByCategory.get(r.category_id) ?? 0) + r.amount,
        );
        plannedItems.push({
          recurring_id: r.id,
          name: r.name,
          due_date: d,
          amount: r.amount,
          category_id: r.category_id,
        });
      }
      d = computeNextDate(d, r.frequency, r.interval_count);
      guard++;
    }
  }

  // 3) Totaux
  const sumMap = (m: Map<any, number>) =>
    Array.from(m.values()).reduce((a, b) => a + b, 0);

  const totalPaid = sumMap(paidByCategory);
  const totalPlanned = sumMap(plannedByCategory);
  const totalRecurringMonth = totalPaid + totalPlanned;

  // Merge par catégorie (paid + planned)
  const allCats = new Set<number | null>([
    ...paidByCategory.keys(),
    ...plannedByCategory.keys(),
  ]);

  const byCategory = Array.from(allCats).map((catId) => ({
    category_id: catId,
    paid: paidByCategory.get(catId) ?? 0,
    planned: plannedByCategory.get(catId) ?? 0,
    total:
      (paidByCategory.get(catId) ?? 0) + (plannedByCategory.get(catId) ?? 0),
  }));

  return {
    month: `${year}-${String(month1to12).padStart(2, "0")}`,
    range: { startYYYY, endYYYY },
    totalPaid,
    totalPlanned,
    totalRecurringMonth,
    byCategory,
    plannedItems, // liste des occurrences futures du mois (utile UI)
  };
}
