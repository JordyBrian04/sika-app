import * as Notifications from "expo-notifications";
import { getOne, runSql } from "../db";
import { computeNextDate } from "../utils/date";
import { scheduleRecurringNotifications } from "./recurringNotifications";

// IMPORTANT : ton type transaction est 'depense'|'entree'
async function insertTransactionFromRecurring(recurringId: number) {
  const r = await getOne<{
    id: number;
    name: string;
    amount: number;
    category_id: number | null;
    next_date: string;
    frequency: any;
    interval_count: number;
    remind_days_before: number;
    active: number;
  }>(`SELECT * FROM recurring_payments WHERE id=?`, [recurringId]);

  if (!r) throw new Error("Recurring not found");
  if (!r.active) return;

  await runSql(
    `INSERT INTO transactions (amount, type, category_id, date, note, recurring_id)
     VALUES (?, 'depense', ?, ?, ?, ?)`,
    [
      r.amount,
      r.category_id ?? null,
      r.next_date,
      `Paiement ${r.frequency}: ${r.name}`,
      r.id,
    ],
  );

  return r;
}

async function advanceRecurring(r: {
  id: number;
  name: string;
  amount: number;
  category_id: number | null;
  next_date: string;
  frequency: any;
  interval_count: number;
  remind_days_before: number;
  active: number;
}) {
  const nextDate = computeNextDate(r.next_date, r.frequency, r.interval_count);

  await runSql(`UPDATE recurring_payments SET next_date = ? WHERE id = ?`, [
    nextDate,
    r.id,
  ]);

  await scheduleRecurringNotifications({
    recurringId: r.id,
    name: r.name,
    amount: r.amount,
    nextDate,
    remindDaysBefore: r.remind_days_before,
  });
}

// Appelle ça au boot pour écouter les réponses
export function registerRecurringNotificationResponseListener(
  getTodayYYYYMMDD: () => string,
) {
  return Notifications.addNotificationResponseReceivedListener(async (resp) => {
    const actionId = resp.actionIdentifier; // PAY / SKIP / DEFAULT
    const data: any = resp.notification.request.content.data;
    const recurringId = data?.recurringId as number | undefined;

    if (!recurringId) return;

    // on ignore le tap "DEFAULT" si tu veux, ou tu l’ouvres sur un écran
    if (actionId !== "PAY" && actionId !== "SKIP") return;

    const r = await getOne<any>(`SELECT * FROM recurring_payments WHERE id=?`, [
      recurringId,
    ]);
    if (!r) return;

    const today = getTodayYYYYMMDD();

    if (actionId === "PAY") {
      const saved = await insertTransactionFromRecurring(recurringId);
      if (saved) await advanceRecurring(saved);
    }

    if (actionId === "SKIP") {
      await advanceRecurring(r);
    }
  });
}
