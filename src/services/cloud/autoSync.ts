/**
 * Auto-sync silencieux — Pro uniquement.
 *
 * Déclenche fullSync() automatiquement :
 *  - Au lancement de l'app (après migrate())
 *  - Quand l'app revient au premier plan (AppState "active")
 *  - Toutes les AUTO_SYNC_INTERVAL_MS pendant que l'app est active
 *
 * Protections :
 *  - Debounce : MIN_SYNC_INTERVAL_MS entre deux syncs (évite le spam)
 *  - Pro check : pas de sync si plan free
 *  - Silent : les erreurs réseau sont ignorées (offline = no-op)
 */

import { AppState, AppStateStatus } from "react-native";
import { isUserPro } from "./planCheck";
import { fullSync } from "./syncService";

const MIN_SYNC_INTERVAL_MS  = 2 * 60 * 1000;  // 2 min entre deux syncs
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;  // sync périodique toutes les 5 min

let lastSyncAt   = 0;
let intervalRef: ReturnType<typeof setInterval> | null = null;
let isSyncing    = false;

async function tryAutoSync(): Promise<void> {
  if (isSyncing) return;

  const now = Date.now();
  if (now - lastSyncAt < MIN_SYNC_INTERVAL_MS) return;

  if (!(await isUserPro())) return;

  isSyncing  = true;
  lastSyncAt = now;
  try {
    await fullSync();
  } catch {
    // Offline ou erreur réseau — silencieux
  } finally {
    isSyncing = false;
  }
}

function startInterval(): void {
  if (intervalRef) return;
  intervalRef = setInterval(tryAutoSync, AUTO_SYNC_INTERVAL_MS);
}

function stopInterval(): void {
  if (intervalRef) {
    clearInterval(intervalRef);
    intervalRef = null;
  }
}

/**
 * Démarre l'auto-sync. Retourne une fonction de cleanup à appeler
 * dans le return du useEffect (désinscrit les listeners + stoppe l'intervalle).
 */
export function registerAutoSync(): () => void {
  // Sync immédiat au lancement
  tryAutoSync();

  // Sync périodique
  startInterval();

  // Sync au retour au premier plan
  const handleAppState = (nextState: AppStateStatus) => {
    if (nextState === "active") {
      tryAutoSync();
      startInterval();
    } else {
      stopInterval();
    }
  };

  const sub = AppState.addEventListener("change", handleAppState);

  return () => {
    sub.remove();
    stopInterval();
  };
}
