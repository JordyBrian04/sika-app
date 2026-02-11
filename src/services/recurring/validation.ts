import { getOne, runSql } from "../../db";

export async function markRecurringOccurrencePaid(queueId: number) {
  const q = await getOne<{
    id: number;
    recurring_id: number;
    due_date: string;
    status: string;
  }>(`SELECT * FROM recurring_due_queue WHERE id=?`, [queueId]);

  if (!q) throw new Error("Queue item not found");
  if (q.status !== "pending") return;

  const r = await getOne<{
    id: number;
    name: string;
    amount: number;
    category_id: number | null;
    frequency: string;
  }>(
    `SELECT id, name, amount, category_id, frequency FROM recurring_payments WHERE id=?`,
    [q.recurring_id],
  );

  if (!r) throw new Error("Recurring not found");

  // ✅ création transaction à la date prévue
  await runSql(
    `INSERT INTO transactions (amount, type, category_id, date, note, recurring_id)
     VALUES (?, 'depense', ?, ?, ?, ?)`,
    [
      r.amount,
      r.category_id ?? null,
      q.due_date,
      `Paiement ${r.frequency}: ${r.name}`,
      r.id,
    ],
  );

  // statut queue
  await runSql(
    `UPDATE recurring_due_queue SET status='paid', decided_at=datetime('now')
     WHERE id=?`,
    [q.id],
  );
}

export async function markRecurringOccurrenceSkipped(queueId: number) {
  const q = await getOne<{ id: number; status: string }>(
    `SELECT id, status FROM recurring_due_queue WHERE id=?`,
    [queueId],
  );
  if (!q) throw new Error("Queue item not found");
  if (q.status !== "pending") return;

  await runSql(
    `UPDATE recurring_due_queue SET status='skipped', decided_at=datetime('now')
     WHERE id=?`,
    [q.id],
  );
}
