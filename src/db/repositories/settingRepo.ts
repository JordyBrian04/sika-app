import { runSql } from "@/src/db/";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { all, seedDefaults } from "../index";

const DB_NAME = "budget.db";

// ─── Chemins (nouvelle API expo-file-system v54) ──────────────────────────────

const sqliteDir = new Directory(Paths.document, "SQLite");
const dbFile    = new File(sqliteDir, DB_NAME);
const backupDir = new Directory(Paths.document, "backups");

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

// ─── Backup ───────────────────────────────────────────────────────────────────

/**
 * Copie la DB vers /backups puis ouvre la Share Sheet.
 * iOS  : enregistrer dans Fichiers, iCloud, AirDrop...
 * Android : idem + accès direct au stockage.
 */
export async function backupDatabaseToShare() {
  if (!dbFile.exists) {
    throw new Error(`DB introuvable : ${dbFile.uri}`);
  }

  if (!backupDir.exists) {
    backupDir.create();
  }

  const backupFile = new File(backupDir, `sika-backup-${timestamp()}.db`);
  try {
    dbFile.copy(backupFile);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      throw new Error("Le partage de fichiers n'est pas disponible.");
    }

    await Sharing.shareAsync(backupFile.uri, {
      mimeType: "application/octet-stream",
      dialogTitle: "Sauvegarder Sika",
      UTI: "public.item",
    });

    return { ok: true, backupPath: backupFile.uri };
  } catch (error) {
    throw error;
  }
}

// ─── Restore ──────────────────────────────────────────────────────────────────

/**
 * Sélectionne un fichier .db et remplace la DB locale.
 *
 * iOS : type "*\/*" est OBLIGATOIRE — les UTI spécifiques (public.data, etc.)
 *       cachent les .db dans l'app Fichiers iOS. Validation après sélection.
 *
 * Bug corrigé : l'ancienne version appelait picked.copy(dbFile) sans await →
 *   la DB était supprimée mais pas encore remplacée au moment du reload → écran noir.
 *
 * IMPORTANT : l'app DOIT être relancée après restore pour que SQLite relise la DB.
 */
export async function pickAndRestoreDatabase() {
  const res = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: "*/*",           // iOS : seule valeur qui affiche tous les fichiers
  });

  if (res.canceled) return { ok: false, cancelled: true };

  const asset = res.assets?.[0];
  if (!asset?.uri) return { ok: false, error: "Fichier invalide" };

  // Validation de l'extension
  const fileName = (asset.name ?? asset.uri.split("/").pop() ?? "").toLowerCase();
  if (!fileName.endsWith(".db")) {
    return {
      ok: false,
      error: "Ce fichier n'est pas une sauvegarde Sika valide (.db).",
    };
  }

  // Créer le dossier SQLite si besoin
  if (!sqliteDir.exists) {
    sqliteDir.create();
  }

  // Supprimer l'ancienne DB
  if (dbFile.exists) {
    dbFile.delete();
  }

  const picked = new File(asset.uri);
  picked.copy(dbFile);

  // Vérification du succès
  if (!dbFile.exists) {
    return { ok: false, error: "La restauration a échoué — fichier non copié." };
  }

  return { ok: true, restoredTo: dbFile.uri, pickedName: asset.name };
}

// ─── Reset ────────────────────────────────────────────────────────────────────

export async function resetAllDatas() {
  try {
    const tablesResult = await all(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`,
    );

    const tables = tablesResult.map((row) => row.name);

    if (tables.length === 0) {
      return { ok: true, message: "Aucune table à supprimer." };
    }

    await runSql("PRAGMA foreign_keys = OFF;");

    for (const table of tables) {
      await runSql(`DELETE FROM ${table};`);
      await runSql(`DELETE FROM sqlite_sequence WHERE name='${table}';`);
    }

    await runSql("PRAGMA foreign_keys = ON;");
    await seedDefaults();

    return { ok: true, message: "Toutes les données ont été réinitialisées." };
  } catch (error) {
    console.error("Erreur lors du reset des données:", error);
    return { ok: false, error };
  }
}
