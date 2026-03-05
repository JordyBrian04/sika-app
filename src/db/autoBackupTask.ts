import * as BackgroundFetch from "expo-background-fetch";
import { Directory, File, Paths } from "expo-file-system";
import * as TaskManager from "expo-task-manager";

const DB_NAME = "budget.db";
export const AUTO_BACKUP_TASK = "AUTO_BACKUP_TASK";

// SQLite folder
const sqliteDir = new Directory(Paths.document, "SQLite");
const dbFile = new File(sqliteDir, DB_NAME);

// Backup folder
const backupDir = new Directory(Paths.document, "backups");

function toYMD(d: Date) {
  return d.toISOString().split("T")[0];
}

// ---------- BACKUP CORE ----------
export async function makeAutoBackupNow() {
  if (!(await dbFile.exists)) {
    throw new Error("DB introuvable");
  }

  if (!(await backupDir.exists)) {
    await backupDir.create({ intermediates: true });
  }

  const backupName = `sika-${toYMD(new Date())}.db`;
  const backupFile = new File(backupDir, backupName);

  await dbFile.copy(backupFile);

  await cleanupOldBackups(10);

  return { ok: true, path: backupFile.uri };
}

// Garde seulement les N derniers backups
async function cleanupOldBackups(keepLast = 10) {
  if (!(await backupDir.exists)) return;

  const files = await backupDir.list();

  const withStats = await Promise.all(
    files.map(async (file) => ({
      file,
      info: await file.info(),
    })),
  );

  withStats.sort(
    (a, b) => (b.info.modificationTime ?? 0) - (a.info.modificationTime ?? 0),
  );

  const toDelete = withStats.slice(keepLast);

  for (const f of toDelete) {
    try {
      await f.file.delete();
    } catch {}
  }
}

// ---------- BACKGROUND TASK ----------
TaskManager.defineTask(AUTO_BACKUP_TASK, async () => {
  try {
    await makeAutoBackupNow();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function isAutoBackupEnabled() {
  return TaskManager.isTaskRegisteredAsync(AUTO_BACKUP_TASK);
}

// ---------- ENABLE / DISABLE ----------
export async function enableAutoBackup(daysInterval: number) {
  const minimumInterval = Math.max(60 * 60 * 24 * daysInterval, 60 * 15);

  await BackgroundFetch.registerTaskAsync(AUTO_BACKUP_TASK, {
    minimumInterval,
    stopOnTerminate: false,
    startOnBoot: true,
  });

  return { ok: true };
}

export async function disableAutoBackup() {
  const isRegistered =
    await TaskManager.isTaskRegisteredAsync(AUTO_BACKUP_TASK);

  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(AUTO_BACKUP_TASK);
  }

  return { ok: true };
}

export async function listLocalBackups() {
  if (!(await backupDir.exists)) return [];

  const files = await backupDir.list();

  return files
    .filter((f) => f.name.endsWith(".db"))
    .map((f) => ({
      name: f.name,
      uri: f.uri,
    }));
}
