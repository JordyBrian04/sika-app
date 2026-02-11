import { all, runSql } from "../../db";
import { scheduleRecurringNotifications } from "../../notifications/recurringNotifications";
import { computeNextDate, fromYYYYMMDD } from "../../utils/date";

type RecurringRow = {
  id: number;
  name: string;
  amount: number;
  category_id: number | null;
  frequency: "semaine" | "mensuel" | "annuel" | "personnalisé";
  interval_count: number;
  next_date: string; // YYYY-MM-DD
  remind_days_before: number;
  active: number;
};

export async function runRecurringCatchUp(todayYYYYMMDD: string) {
  const today = fromYYYYMMDD(todayYYYYMMDD);

  const recurrences = await all<RecurringRow>(
    `SELECT * FROM recurring_payments WHERE active=1`,
  );

  for (const r of recurrences) {
    // si déjà future => rien à catch-up
    let next = r.next_date;
    let nextDate = fromYYYYMMDD(next);

    if (nextDate.getTime() >= today.getTime()) {
      // juste s'assurer que les notifs sont ok
      await scheduleRecurringNotifications({
        recurringId: r.id,
        name: r.name,
        amount: r.amount,
        nextDate: r.next_date,
        remindDaysBefore: r.remind_days_before,
      });
      continue;
    }

    // 1) Tant que next_date est dans le passé : on ajoute dans la queue
    // et on avance next_date.
    let guard = 0;
    while (fromYYYYMMDD(next).getTime() < today.getTime() && guard < 500) {
      // Insert occurrence en pending (anti doublon via UNIQUE)
      await runSql(
        `INSERT OR IGNORE INTO recurring_due_queue (recurring_id, due_date, status)
         VALUES (?, ?, 'pending')`,
        [r.id, next],
      );

      // calcule occurrence suivante
      next = computeNextDate(next, r.frequency, r.interval_count);
      guard++;
    }

    // 2) Met à jour la prochaine date
    await runSql(`UPDATE recurring_payments SET next_date=? WHERE id=?`, [
      next,
      r.id,
    ]);

    // 3) Re-planifie les notifications sur la nouvelle next_date
    await scheduleRecurringNotifications({
      recurringId: r.id,
      name: r.name,
      amount: r.amount,
      nextDate: next,
      remindDaysBefore: r.remind_days_before,
    });
  }
}
