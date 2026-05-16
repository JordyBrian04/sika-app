/**
 * Service de synchronisation cloud pour Sika App.
 *
 * Le schéma SQLite local et le schéma Supabase sont différents :
 *  - Local  : clés entières (id, category_id, goal_id...)
 *  - Cloud  : clés UUID    (sync_id, category_sync_id, goal_sync_id...)
 *
 * Ce service fait la transformation dans les deux sens :
 *  - Push : local → cloud  (integer IDs → sync_id UUIDs)
 *  - Pull : cloud → local  (sync_id UUIDs → integer IDs via lookup)
 *
 * ORDRE CRITIQUE : les tables parentes sont traitées AVANT les enfants
 * pour que les FK soient résolvables au moment du pull.
 */

import { all, getOne, runSql } from "@/src/db";
import { apiFetch } from "./api";

// ─── Tables synchronisées — ORDRE : parents d'abord ─────────────────────────

const SYNCABLE_TABLES = [
  "categories",           // parent
  "saving_goals",         // parent
  "recurring_payments",   // dépend de categories
  "transactions",         // dépend de categories + recurring_payments
  "budgets",              // dépend de categories
  "goal_contributions",   // dépend de saving_goals
  "goal_rules",           // dépend de saving_goals
  "goal_streaks",         // dépend de saving_goals
  "closures",             // standalone
] as const;

type SyncableTable = (typeof SYNCABLE_TABLES)[number];

// ─── Device ID ───────────────────────────────────────────────────────────────

async function getDeviceId(): Promise<string> {
  const row = await getOne<{ device_id: string | null }>(
    `SELECT device_id FROM user_profile WHERE id = 1`
  );
  if (row?.device_id) return row.device_id;
  const deviceId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await runSql(`UPDATE user_profile SET device_id = ? WHERE id = 1`, [deviceId]);
  return deviceId;
}

// ─── Helpers UUID ─────────────────────────────────────────────────────────────

function generateSyncId(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    "-" + Date.now().toString(36) +
    "-" + Math.random().toString(36).slice(2, 6)
  );
}

/** Récupère le sync_id d'un enregistrement local par son id entier */
async function getSyncId(table: string, localId: number | null | undefined): Promise<string | null> {
  if (!localId) return null;
  const row = await getOne<{ sync_id: string | null }>(
    `SELECT sync_id FROM ${table} WHERE id = ?`,
    [localId]
  );
  if (row?.sync_id) return row.sync_id;
  // Générer un sync_id s'il n'existe pas encore
  return ensureSyncId(table, localId);
}

/** Récupère l'id local entier à partir du sync_id (UUID) */
async function getLocalId(table: string, syncId: string | null | undefined): Promise<number | null> {
  if (!syncId) return null;
  const row = await getOne<{ id: number }>(
    `SELECT id FROM ${table} WHERE sync_id = ?`,
    [syncId]
  );
  return row?.id ?? null;
}

/** Assure qu'un enregistrement a bien un sync_id, en génère un si absent */
async function ensureSyncId(table: string, localId: number): Promise<string> {
  const existing = await getOne<{ sync_id: string | null }>(
    `SELECT sync_id FROM ${table} WHERE id = ?`, [localId]
  );
  if (existing?.sync_id) return existing.sync_id;
  const newSyncId = generateSyncId();
  await runSql(`UPDATE ${table} SET sync_id = ? WHERE id = ?`, [newSyncId, localId]);
  return newSyncId;
}

// ─── Transformation local → cloud (PUSH) ─────────────────────────────────────

/**
 * Transforme une ligne SQLite locale en payload Supabase.
 * Résout les clés entières en sync_id UUID.
 * Retourne null si la ligne doit être ignorée (orphelin).
 */
async function prepareForCloud(
  table: SyncableTable,
  row: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const r = row as any;

  // Garantir un sync_id
  const sync_id = r.sync_id ?? (r.id ? await ensureSyncId(table, r.id) : generateSyncId());

  const base = {
    sync_id,
    updated_at: r.updated_at ?? r.created_at ?? new Date().toISOString(),
    deleted_at: r.deleted_at ?? null,
    created_at: r.created_at ?? new Date().toISOString(),
  };

  switch (table) {
    case "categories":
      return { ...base, name: r.name, type: r.type };

    case "transactions": {
      const category_sync_id  = await getSyncId("categories", r.category_id);
      const recurring_sync_id = await getSyncId("recurring_payments", r.recurring_id);
      return {
        ...base,
        amount: r.amount, type: r.type, date: r.date,
        note: r.note ?? null, paid_at: r.paid_at ?? null,
        category_sync_id, recurring_sync_id,
      };
    }

    case "budgets": {
      const category_sync_id = await getSyncId("categories", r.category_id);
      return { ...base, month: r.month, year: r.year, limit_amount: r.limit_amount, category_sync_id };
    }

    case "recurring_payments": {
      const category_sync_id = await getSyncId("categories", r.category_id);
      return {
        ...base,
        name: r.name, amount: r.amount, frequency: r.frequency,
        interval_count: r.interval_count, next_date: r.next_date,
        custom_unit: r.custom_unit ?? null, remind_days_before: r.remind_days_before,
        active: r.active, category_sync_id,
      };
    }

    case "saving_goals":
      return {
        ...base,
        name: r.name, target_amount: r.target_amount, target_date: r.target_date,
        start_date: r.start_date ?? null, frequence: r.frequence ?? null,
        priority: r.priority ?? "medium", min_weekly: r.min_weekly,
        active: r.active, current_amount: r.current_amount,
      };

    case "goal_contributions": {
      const goal_sync_id = await getSyncId("saving_goals", r.goal_id);
      if (!goal_sync_id) return null;
      return { ...base, amount: r.amount, date: r.date, note: r.note ?? null, source: r.source ?? "manual", goal_sync_id };
    }

    case "goal_rules": {
      const goal_sync_id = await getSyncId("saving_goals", r.goal_id);
      if (!goal_sync_id) return null;
      return { ...base, rule_type: r.rule_type, value: r.value, goal_sync_id };
    }

    case "goal_streaks": {
      const goal_sync_id = await getSyncId("saving_goals", r.goal_id);
      if (!goal_sync_id) return null;
      return {
        ...base,
        current_streak: r.current_streak, best_streak: r.best_streak,
        last_success_week: r.last_success_week ?? null, goal_sync_id,
      };
    }

    case "closures":
      return {
        ...base,
        month: r.month, year: r.year,
        theoretical_balance: r.theoretical_balance, physical_balance: r.physical_balance,
        difference: r.difference, note: r.note ?? null,
      };

    default:
      return null;
  }
}

// ─── Transformation cloud → local (PULL) ─────────────────────────────────────

/**
 * Transforme une ligne Supabase en payload SQLite local.
 * Résout les sync_id UUID en id entiers locaux.
 * Retourne null si un parent obligatoire n'est pas trouvé localement.
 */
async function prepareForLocal(
  table: SyncableTable,
  row: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const r = row as any;

  const base = {
    sync_id:     r.sync_id,
    sync_status: 0, // pulled = déjà synchronisé
    updated_at:  r.updated_at ?? null,
    deleted_at:  r.deleted_at ?? null,
    created_at:  r.created_at ?? null,
  };

  switch (table) {
    case "categories":
      return { ...base, name: r.name, type: r.type };

    case "transactions": {
      const category_id  = await getLocalId("categories", r.category_sync_id);
      const recurring_id = await getLocalId("recurring_payments", r.recurring_sync_id);
      return {
        ...base,
        amount: r.amount, type: r.type, date: r.date,
        note: r.note ?? null, paid_at: r.paid_at ?? null,
        category_id, recurring_id,
      };
    }

    case "budgets": {
      const category_id = await getLocalId("categories", r.category_sync_id);
      return { ...base, month: r.month, year: r.year, limit_amount: r.limit_amount, category_id };
    }

    case "recurring_payments": {
      const category_id = await getLocalId("categories", r.category_sync_id);
      return {
        ...base,
        name: r.name, amount: r.amount, frequency: r.frequency,
        interval_count: r.interval_count, next_date: r.next_date,
        custom_unit: r.custom_unit ?? null, remind_days_before: r.remind_days_before,
        active: r.active, category_id,
      };
    }

    case "saving_goals":
      return {
        ...base,
        name: r.name, target_amount: r.target_amount, target_date: r.target_date,
        start_date: r.start_date ?? null, frequence: r.frequence ?? null,
        priority: r.priority ?? "medium", min_weekly: r.min_weekly,
        active: r.active, current_amount: r.current_amount,
      };

    case "goal_contributions": {
      const goal_id = await getLocalId("saving_goals", r.goal_sync_id);
      if (!goal_id) return null;
      return { ...base, amount: r.amount, date: r.date, note: r.note ?? null, source: r.source ?? "manual", goal_id };
    }

    case "goal_rules": {
      const goal_id = await getLocalId("saving_goals", r.goal_sync_id);
      if (!goal_id) return null;
      return { ...base, rule_type: r.rule_type, value: r.value, goal_id };
    }

    case "goal_streaks": {
      const goal_id = await getLocalId("saving_goals", r.goal_sync_id);
      if (!goal_id) return null;
      return {
        ...base,
        current_streak: r.current_streak, best_streak: r.best_streak,
        last_success_week: r.last_success_week ?? null, goal_id,
      };
    }

    case "closures":
      return {
        ...base,
        month: r.month, year: r.year,
        theoretical_balance: r.theoretical_balance, physical_balance: r.physical_balance,
        difference: r.difference, note: r.note ?? null,
      };

    default:
      return null;
  }
}

// ─── Push ────────────────────────────────────────────────────────────────────

async function pushPendingChanges(deviceId: string): Promise<{ pushed: number; errors: string[] }> {
  const changes: { table: SyncableTable; rows: Record<string, unknown>[] }[] = [];
  const allErrors: string[] = [];

  // Respecter l'ordre parent → enfant
  for (const table of SYNCABLE_TABLES) {
    try {
      const localRows = await all<Record<string, unknown>>(
        `SELECT * FROM ${table} WHERE sync_status = 1 OR sync_id IS NULL`
      );
      if (!localRows?.length) continue;

      const transformed: Record<string, unknown>[] = [];
      for (const row of localRows) {
        const cloud = await prepareForCloud(table, row);
        if (cloud) transformed.push(cloud);
      }
      if (transformed.length > 0) changes.push({ table, rows: transformed });
    } catch (e: any) {
      allErrors.push(`push/${table}: ${e?.message}`);
    }
  }

  if (changes.length === 0) return { pushed: 0, errors: allErrors };

  try {
    const res = await apiFetch("/sync/push", {
      method: "POST",
      body: JSON.stringify({ device_id: deviceId, changes }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { pushed: 0, errors: [...allErrors, body?.error ?? `HTTP ${res.status}`] };
    }

    const data = await res.json();
    let totalPushed = 0;

    // Marquer sync_status=0 pour les lignes envoyées avec succès
    for (const { table, rows } of changes) {
      const tableResult = data.results?.[table];
      if (!tableResult || tableResult.upserted === 0) continue;

      const syncIds = rows
        .map((r) => r.sync_id as string | null)
        .filter((id): id is string => !!id);

      if (syncIds.length > 0) {
        // Mettre à jour par batch de 100 pour éviter les requêtes SQL trop longues
        for (let i = 0; i < syncIds.length; i += 100) {
          const batch = syncIds.slice(i, i + 100);
          const placeholders = batch.map(() => "?").join(",");
          await runSql(
            `UPDATE ${table} SET sync_status = 0 WHERE sync_id IN (${placeholders})`,
            batch
          );
        }
        totalPushed += syncIds.length;
      }
    }

    return { pushed: totalPushed, errors: allErrors };
  } catch (e: any) {
    return { pushed: 0, errors: [...allErrors, e?.message ?? "Erreur réseau (push)"] };
  }
}

// ─── Pull ────────────────────────────────────────────────────────────────────

async function pullChanges(
  deviceId: string,
  lastSyncAt: string | null
): Promise<{ pulled: number; errors: string[]; synced_at?: string }> {
  try {
    const res = await apiFetch("/sync/pull", {
      method: "POST",
      body: JSON.stringify({ device_id: deviceId, last_sync_at: lastSyncAt }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { pulled: 0, errors: [body?.error ?? `HTTP ${res.status}`] };
    }

    const data = await res.json();
    let totalPulled = 0;
    const errors: string[] = [];

    // Parcourir dans l'ORDRE parent → enfant (crucial !)
    for (const table of SYNCABLE_TABLES) {
      const rows: Record<string, unknown>[] = data.changes?.[table] ?? [];
      if (rows.length === 0) continue;

      for (const row of rows) {
        try {
          // Gérer les soft-deletes : si deleted_at est set, supprimer localement
          if ((row as any).deleted_at) {
            const syncId = (row as any).sync_id;
            if (syncId) {
              await runSql(`DELETE FROM ${table} WHERE sync_id = ?`, [syncId]);
              totalPulled++;
            }
            continue;
          }

          const local = await prepareForLocal(table, row);
          if (!local || !local.sync_id) {
            // Log quand un enregistrement est ignoré (parent manquant)
            console.warn(`[sync] Skip ${table}: sync_id=${(row as any).sync_id} (parent not found)`);
            continue;
          }

          const existing = await getOne<{ id: number }>(
            `SELECT id FROM ${table} WHERE sync_id = ?`,
            [local.sync_id as string]
          );

          if (existing) {
            // UPDATE — exclure id et sync_id de la mise à jour
            const { sync_id, id, ...updateCols } = local as any;
            const cols = Object.keys(updateCols);
            if (cols.length === 0) continue;
            const setClause = cols.map((c) => `${c} = ?`).join(", ");
            const values = cols.map((c) => updateCols[c] as string | number | null);
            await runSql(
              `UPDATE ${table} SET ${setClause} WHERE sync_id = ?`,
              [...values, sync_id]
            );
          } else {
            // INSERT
            const { id: _id, ...insertCols } = local as any;
            const cols = Object.keys(insertCols);
            if (cols.length === 0) continue;
            const placeholders = cols.map(() => "?").join(", ");
            const values = cols.map((c) => insertCols[c] as string | number | null);
            await runSql(
              `INSERT OR IGNORE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
              values
            );
          }
          totalPulled++;
        } catch (e: any) {
          errors.push(`pull/${table}/${(row as any).sync_id}: ${e?.message}`);
        }
      }
    }

    return { pulled: totalPulled, errors, synced_at: data.synced_at };
  } catch (e: any) {
    return { pulled: 0, errors: [e?.message ?? "Erreur réseau (pull)"] };
  }
}

// ─── Full sync ───────────────────────────────────────────────────────────────

export type SyncResult = {
  ok: boolean;
  pushed: number;
  pulled: number;
  error?: string;
  errors?: string[];
  synced_at?: string;
};

export async function fullSync(): Promise<SyncResult> {
  try {
    const deviceId = await getDeviceId();

    const lastSyncRow = await getOne<{ last_sync_at: string | null }>(
      `SELECT last_sync_at FROM user_profile WHERE id = 1`
    );
    const lastSyncAt = lastSyncRow?.last_sync_at ?? null;

    // 1. Push d'abord (envoyer nos changements)
    const pushResult = await pushPendingChanges(deviceId);
    if (pushResult.errors.length > 0) {
      console.warn("[sync] push warnings:", pushResult.errors);
    }

    // Si erreur HTTP (pas de connexion, serveur down), arrêter
    const httpError = pushResult.errors.find(e => e.includes("HTTP") || e.includes("réseau"));
    if (pushResult.pushed === 0 && httpError) {
      return { ok: false, pushed: 0, pulled: 0, error: httpError, errors: pushResult.errors };
    }

    // 2. Puis pull (récupérer les changements des autres appareils)
    const pullResult = await pullChanges(deviceId, lastSyncAt);
    if (pullResult.errors.length > 0) {
      console.warn("[sync] pull warnings:", pullResult.errors);
    }

    // 3. Sauvegarder le timestamp du serveur comme référence
    const syncedAt = pullResult.synced_at ?? new Date().toISOString();
    await runSql(`UPDATE user_profile SET last_sync_at = ? WHERE id = 1`, [syncedAt]);

    const allErrors = [...pushResult.errors, ...pullResult.errors];

    return {
      ok: true,
      pushed: pushResult.pushed,
      pulled: pullResult.pulled,
      synced_at: syncedAt,
      errors: allErrors.length > 0 ? allErrors : undefined,
    };
  } catch (e: any) {
    return {
      ok: false,
      pushed: 0,
      pulled: 0,
      error: e?.message ?? "Erreur inattendue lors du sync",
    };
  }
}

/** Marque un enregistrement comme "à synchroniser" */
export async function markPending(table: SyncableTable, syncId: string): Promise<void> {
  await runSql(
    `UPDATE ${table} SET sync_status = 1, updated_at = datetime('now') WHERE sync_id = ?`,
    [syncId]
  );
}
