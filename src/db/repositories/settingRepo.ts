import { runSql } from "@/src/db/";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { all, seedDefaults } from "../index";

/**
 * Mets ici le nom EXACT du fichier sqlite.
 * Exemple si tu fais openDatabase("sika.db") -> DB_NAME = "sika.db"
 */
const DB_NAME = "budget.db";

// Dossier SQLite
const sqliteDir = new Directory(Paths.document, "SQLite");
const dbFile = new File(sqliteDir, DB_NAME);

// Dossier de backup (dans le documentDirectory)
const backupDir = new Directory(Paths.document, "backups");

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/**
 * Export / backup: copie le fichier sqlite vers /backups puis ouvre la share sheet.
 */
export async function backupDatabaseToShare() {
  // Vérifie DB
  if (!(await dbFile.exists)) {
    throw new Error(`DB introuvable: ${dbFile.uri}`);
  }

  // Crée le dossier backups si besoin
  if (!(await backupDir.exists)) {
    await backupDir.create({ intermediates: true });
  }

  const backupName = `sika-backup-${timestamp()}.db`;
  const backupFile = new File(backupDir, backupName);

  // Copie DB -> backup
  await dbFile.copy(backupFile);

  // Partage
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(backupFile.uri, {
      mimeType: "application/octet-stream",
      dialogTitle: "Sauvegarde Sika",
      UTI: "public.database",
    });
  }

  return { ok: true, backupPath: backupFile.uri };
}

// ---------- RESTORE (Import) ----------
/**
 * Sélectionne un fichier .db avec DocumentPicker, puis remplace la DB locale.
 * IMPORTANT: Après restore, tu dois RESTART l'app (ou reload) pour rouvrir SQLite proprement.
 */
export async function pickAndRestoreDatabase() {
  const res = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: "*/*",
  });

  if (res.canceled) return { ok: false, cancelled: true };

  const asset = res.assets?.[0];
  if (!asset?.uri) return { ok: false, error: "Fichier invalide" };

  if (!(await sqliteDir.exists)) {
    await sqliteDir.create({ intermediates: true });
  }

  // Fichier source sélectionné
  const picked = new File(asset.uri);

  if (dbFile.exists) {
    dbFile.delete();
  }

  // Remplace la DB (copie vers SQLite/sika.db)
  picked.copy(dbFile);

  return { ok: true, restoredTo: dbFile.uri, pickedName: asset.name };
}

export async function resetAllDatas() {
  try {
    const tablesResult = await all(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`,
    );

    const tables = tablesResult.map((row) => row.name);

    if (tables.length === 0) {
      console.warn("Aucune table trouvée pour le reset.");
      return { ok: true, message: "Aucune table à supprimer." };
    }

    await runSql("PRAGMA foreign_keys = OFF;");

    for (const table of tables) {
      await runSql(`DELETE FROM ${table};`);
      await runSql(`DELETE FROM sqlite_sequence WHERE name='${table}';`); // reset auto-increment
    }

    await runSql("PRAGMA foreign_keys = ON;");

    await seedDefaults();

    return { ok: true, message: "Toutes les données ont été réinitialisées." };
  } catch (error) {
    console.error("Erreur lors du reset des données:", error);
    return { ok: false, error };
  }
}
