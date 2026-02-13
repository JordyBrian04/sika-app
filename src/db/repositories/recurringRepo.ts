import {
  cancelRecurringNotifications,
  scheduleRecurringNotifications,
} from "../../notifications/recurringNotifications";
import { all, getOne, runSql } from "../index";

export type RecurringFrequency = "semaine" | "mensuel" | "annuel" | "jour";

export type RecurringInput = {
  name: string;
  amount: number;
  category_id?: number | null;
  frequency: RecurringFrequency;
  interval_count?: number; // default 1
  next_date: string; // YYYY-MM-DD
  remind_days_before?: number; // default 2
  active?: number; // 1/0
};

export async function addRecurringPayment(input: RecurringInput) {
  const interval = Math.max(1, input.interval_count ?? 1);
  const remind = Math.max(0, input.remind_days_before ?? 2);
  const active = input.active ?? 1;

  // INSERT
  // NOTE: si tu veux récupérer lastInsertRowId via runAsync result, utilise getDb().runAsync directement.
  await runSql(
    `INSERT INTO recurring_payments (name, amount, category_id, frequency, interval_count, next_date, remind_days_before, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.amount,
      input.category_id ?? null,
      input.frequency,
      interval,
      input.next_date,
      remind,
      active,
    ],
  );

  // récupérer l’ID du dernier recurring (simple)
  const row = await getOne<{ id: number }>(
    `SELECT id FROM recurring_payments ORDER BY id DESC LIMIT 1`,
  );
  const recurringId = row?.id;
  if (!recurringId) return;

  if (active === 1) {
    await scheduleRecurringNotifications({
      recurringId,
      name: input.name,
      amount: input.amount,
      nextDate: input.next_date,
      remindDaysBefore: remind,
    });
  }

  return recurringId;
}

export async function updateRecurringPayment(
  id: number,
  input: Partial<RecurringInput>,
) {
  const current = await getOne<any>(
    `SELECT * FROM recurring_payments WHERE id=?`,
    [id],
  );
  if (!current) throw new Error("Recurring not found");

  const next = {
    name: input.name ?? current.name,
    amount: input.amount ?? current.amount,
    category_id: input.category_id ?? current.category_id,
    frequency: input.frequency ?? current.frequency,
    interval_count: Math.max(
      1,
      input.interval_count ?? current.interval_count ?? 1,
    ),
    next_date: input.next_date ?? current.next_date,
    remind_days_before: Math.max(
      0,
      input.remind_days_before ?? current.remind_days_before ?? 2,
    ),
    active: input.active ?? current.active,
  };

  await runSql(
    `UPDATE recurring_payments
     SET name=?, amount=?, category_id=?, frequency=?, interval_count=?, next_date=?, remind_days_before=?, active=?
     WHERE id=?`,
    [
      next.name,
      next.amount,
      next.category_id ?? null,
      next.frequency,
      next.interval_count,
      next.next_date,
      next.remind_days_before,
      next.active,
      id,
    ],
  );

  // Notifications: si inactive => cancel, sinon reschedule
  if (next.active === 1) {
    await scheduleRecurringNotifications({
      recurringId: id,
      name: next.name,
      amount: next.amount,
      nextDate: next.next_date,
      remindDaysBefore: next.remind_days_before,
    });
  } else {
    await cancelRecurringNotifications(id);
  }
}

export async function deleteRecurringPayment(id: number) {
  await cancelRecurringNotifications(id);
  await runSql(`DELETE FROM recurring_payments WHERE id=?`, [id]);
}

export async function setRecurringActive(id: number, active: 0 | 1) {
  await updateRecurringPayment(id, { active });
}

export async function listUpcomingRecurring(daysAhead = 60) {
  // événements à venir "propres"
  return all<{
    id: number;
    name: string;
    amount: number;
    category_id: number | null;
    next_date: string;
    remind_days_before: number;
    frequency: string;
    interval_count: number;
  }>(
    `
    SELECT id, name, amount, category_id, next_date, remind_days_before, frequency, interval_count
    FROM recurring_payments
    WHERE active=1
      AND next_date <= date('now', ?)
    ORDER BY next_date ASC
    `,
    [`+${daysAhead} day`],
  );
}

export async function listPendingRecurringOccurrences(limit = 50) {
  return all<{
    id: number;
    recurring_id: number;
    due_date: string;
    status: string;
    name: string;
    amount: number;
  }>(
    `
    SELECT q.id, q.recurring_id, q.due_date, q.status, r.name, r.amount
    FROM recurring_due_queue q
    JOIN recurring_payments r ON r.id = q.recurring_id
    WHERE q.status='pending'
    ORDER BY q.due_date ASC
    LIMIT ?
    `,
    [limit],
  );
}
