import { all, getOne, runSql } from "../index";
import { addTransaction } from "./transactions";

// ─── Types ───────────────────────────────────────────────────────
export type ClosureRow = {
  id: number;
  month: number;
  year: number;
  theoretical_balance: number;
  physical_balance: number;
  difference: number;
  transaction_id: number | null;
  note: string | null;
  created_at: string;
};

// ─── Helpers ─────────────────────────────────────────────────────

/** Renvoie (ou crée) l'id de la catégorie "Écart" pour le type donné */
async function getOrCreateEcartCategory(
  type: "depense" | "entree",
): Promise<number> {
  const existing = await getOne<{ id: number }>(
    `SELECT id FROM categories WHERE name = 'Écart' AND type = ?`,
    [type],
  );
  if (existing) return existing.id;

  await runSql(`INSERT INTO categories (name, type) VALUES ('Écart', ?)`, [
    type,
  ]);
  const row = await getOne<{ id: number }>(
    `SELECT last_insert_rowid() as id;`,
  );
  return row!.id;
}

/** Dernier jour du mois (ex: 2026-03-31) */
function lastDayOfMonth(month: number, year: number): string {
  const d = new Date(year, month, 0); // jour 0 du mois suivant = dernier jour
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ─── Solde théorique pour un mois ────────────────────────────────
/** Calcule le solde global (toutes transactions depuis le début jusqu'à la fin du mois) */
export async function getTheoreticalBalance(
  month: number,
  year: number,
): Promise<number> {
  const endDate = lastDayOfMonth(month, year);
  const row = await getOne<{ balance: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'entree' THEN amount ELSE 0 END), 0)
     - COALESCE(SUM(CASE WHEN type = 'depense' THEN amount ELSE 0 END), 0) as balance
     FROM transactions
     WHERE date <= ?`,
    [endDate],
  );
  return row?.balance ?? 0;
}

// ─── Vérifier si un mois est déjà clôturé ────────────────────────
export async function isMonthClosed(
  month: number,
  year: number,
): Promise<boolean> {
  const row = await getOne<{ c: number }>(
    `SELECT COUNT(*) as c FROM closures WHERE month = ? AND year = ?`,
    [month, year],
  );
  return (row?.c ?? 0) > 0;
}

// ─── Clôturer un mois ────────────────────────────────────────────
export async function closureMonth(input: {
  month: number;
  year: number;
  physicalBalance: number;
  note?: string;
}): Promise<{ closureId: number; transactionId: number | null }> {
  const { month, year, physicalBalance, note } = input;

  // 1. Solde théorique
  const theoretical = await getTheoreticalBalance(month, year);
  const diff = physicalBalance - theoretical;

  let transactionId: number | null = null;

  // 2. Si écart != 0, créer une transaction d'ajustement
  if (diff !== 0) {
    const type = diff > 0 ? "entree" : "depense";
    const categoryId = await getOrCreateEcartCategory(type);
    const date = lastDayOfMonth(month, year);

    transactionId =
      (await addTransaction({
        amount: Math.abs(diff),
        type,
        category_id: categoryId,
        date,
        note: note || `Clôture ${String(month).padStart(2, "0")}/${year} — Écart`,
      })) ?? null;
  }

  // 3. Enregistrer la clôture
  const now = new Date().toISOString();
  await runSql(
    `INSERT INTO closures (month, year, theoretical_balance, physical_balance, difference, transaction_id, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [month, year, theoretical, physicalBalance, diff, transactionId, note ?? null, now],
  );

  const row = await getOne<{ id: number }>(
    `SELECT last_insert_rowid() as id;`,
  );

  return { closureId: row!.id, transactionId };
}

// ─── Annuler une clôture ─────────────────────────────────────────
export async function cancelClosure(closureId: number): Promise<void> {
  const closure = await getOne<ClosureRow>(
    `SELECT * FROM closures WHERE id = ?`,
    [closureId],
  );
  if (!closure) return;

  // Supprimer la transaction d'ajustement associée
  if (closure.transaction_id) {
    await runSql(`DELETE FROM transactions WHERE id = ?`, [
      closure.transaction_id,
    ]);
  }

  await runSql(`DELETE FROM closures WHERE id = ?`, [closureId]);
}

// ─── Historique des clôtures ─────────────────────────────────────
export async function listClosures(limit = 12): Promise<ClosureRow[]> {
  return all<ClosureRow>(
    `SELECT * FROM closures ORDER BY year DESC, month DESC LIMIT ?`,
    [limit],
  );
}

// ─── Récupérer une clôture spécifique ────────────────────────────
export async function getClosureForMonth(
  month: number,
  year: number,
): Promise<ClosureRow | null> {
  return getOne<ClosureRow>(
    `SELECT * FROM closures WHERE month = ? AND year = ?`,
    [month, year],
  );
}
