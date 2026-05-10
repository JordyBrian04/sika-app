import * as SQLite from "expo-sqlite";
import { DB_NAME, DB_VERSION, migrations } from "./schema";

export type SQLParams = (string | number | null)[];

let db: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) db = SQLite.openDatabaseAsync(DB_NAME);
  return db;
}

export async function runSql(
  sql: string,
  params: SQLParams = [],
): Promise<void> {
  // const database = await getDb();
  try {
    const database = await getDb();

    await database.runAsync(sql, params);

  } catch (error) {
    console.error("SQL ERROR:", error);
    throw error;
  }
}

export async function all<T = any>(
  sql: string,
  params: SQLParams = [],
): Promise<T[]> {
  const database = await getDb();
  return new Promise(async (resolve, reject) => {
    await database
      .getAllAsync(sql, params)
      .then((rows) => resolve(rows as T[]))
      .catch(reject);
    // database.transaction((tx) => {
    //   tx.executeSql(
    //     sql,
    //     params as any,
    //     (_tx, result) => resolve(result.rows._array as T[]),
    //     (_tx, err) => {
    //       reject(err);
    //       return true;
    //     }
    //   );
    // });
  });
}

export function getOne<T = any>(
  sql: string,
  params: SQLParams = [],
): Promise<T | null> {
  return all<T>(sql, params).then((rows) => rows[0] ?? null);
}

export async function migrate() {
  // PRAGMA user_version = DB_VERSION
  const current = await getOne<{ user_version: number }>(
    "PRAGMA user_version;",
  );
  const currentVersion = current?.user_version ?? 0;

  console.log(
    `Current DB version: ${currentVersion}, app requires: ${DB_VERSION}`,
  );

  if (currentVersion < DB_VERSION) {
    for (let v = currentVersion + 1; v <= DB_VERSION; v++) {
      const steps = migrations[v];
      if (!steps) continue;

      for (const step of steps) {
        try {
          await runSql(step);
        } catch (e: any) {
          const msg: string = e?.message ?? "";
          // ALTER TABLE ADD COLUMN est non-idempotent en SQLite.
          // Cas 1 : colonne déjà présente (migration partiellement appliquée)
          if (msg.includes("duplicate column name")) {
            console.warn(`[migrate] colonne déjà existante, ignoré : ${msg}`);
            continue;
          }
          // Cas 2 : default non-constant (ex: DEFAULT (datetime('now')))
          // → impossible dans ALTER TABLE, on continue sans default
          if (msg.includes("non-constant default") || msg.includes("Cannot add a column with non-constant default")) {
            console.warn(`[migrate] default non-constant ignoré : ${msg}`);
            continue;
          }
          // Toute autre erreur est fatale
          throw e;
        }
      }
      await runSql(`PRAGMA user_version = ${v};`);
    }
  }

  // seed minimal default data (categories + badges) on every install
  await seedDefaults();
}

export async function seedDefaults() {
  // --- Categories seed (only if empty) ---
  const catRow = await getOne<{ c: number }>(
    "SELECT COUNT(*) as c FROM categories;",
  );
  console.log("Categories count:", catRow?.c);
  if ((catRow?.c ?? 0) === 0) {
    const defaults = [
      ["Autre dépense", "depense"],
      ["Alimentation", "depense"],
      ["Transport", "depense"],
      ["Loyer", "event"],
      ["Factures", "event"],
      ["Abonnements", "event"],
      ["Santé", "depense"],
      ["Loisirs", "depense"],
      ["Famille", "depense"],
      ["Education", "depense"],
      ["Shopping", "depense"],
      ["Téléphone/Internet", "depense"],
      ["Soin personnel", "depense"],
      ["Salaire", "entree"],
      ["Fond de depart", "entree"],
      ["Frais mission", "entree"],
      ["Autres revenus", "entree"],
    ];

    for (const [name, type] of defaults) {
      await runSql(`INSERT INTO categories (name, type) VALUES (?, ?)`, [
        name,
        type,
      ]);
    }
  }

  // --- Badges seed (always run with INSERT OR IGNORE) ---
  const badges = [
    ["FIRST_TX", "Premier mouvement", "Tu as ajouté ta première transaction."],
    ["FIRST_EXPENSE", "Première dépense", "Tu as enregistré une dépense."],
    ["FIRST_INCOME", "Premier revenu", "Tu as enregistré un revenu."],
    ["FIRST_BUDGET", "Planificateur", "Tu as créé ton premier budget."],
    ["FIRST_GOAL", "Objectif lancé", "Tu as créé un objectif d’épargne."],

    ["NO_SPEND_DAY", "Journée clean", "Aucune dépense aujourd’hui."],
    ["WEEK_CONTROL", "Maîtrise hebdo", "Budget respecté pendant 7 jours."],
    ["MONTH_CONTROL", "Maîtrise mensuelle", "Budget respecté ce mois-ci."],
    ["THREE_MONTHS", "Discipline", "3 mois consécutifs sans dépassement."],

    ["TEN_TX", "Actif", "10 transactions enregistrées."],
    ["FIFTY_TX", "Ultra actif", "50 transactions enregistrées."],
    ["HUNDRED_TX", "Machine", "100 transactions enregistrées."],

    ["SAVE_START", "Premier pas", "Première épargne enregistrée."],
    ["SAVE_50K", "Épargnant", "50 000 FCFA économisés."],
    ["SAVE_100K", "Stratège", "100 000 FCFA économisés."],
    ["GOAL_DONE", "Objectif atteint", "Objectif d’épargne complété."],

    ["RECURRING_CREATED", "Organisé", "Paiement récurrent créé."],
    ["BILLS_TRACKED", "Factures suivies", "Plusieurs paiements suivis."],
  ];
  for (const [code, title, description] of badges) {
    await runSql(
      `INSERT OR IGNORE INTO badges (code, title, description) VALUES (?, ?, ?)`,
      [code, title, description],
    );
  }
}
