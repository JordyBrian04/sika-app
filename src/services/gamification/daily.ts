import { diffDays } from "@/src/utils/goalDates";
import { getOne, runSql } from "../../db";
import { getLevelInfo, reward, XpAction } from "./xpService";
// import { getLevelInfo } from "./leveling";

// ---------- Types ----------
// export type XpAction =
//   | "ADD_EXPENSE"
//   | "ADD_INCOME"
//   | "CREATE_BUDGET"
//   | "ADD_RECURRING"
//   | "CREATE_GOAL"
//   | "ADD_SAVING"
//   | "MONTH_OK";

type MissionRow = {
  id: number;
  date: string;
  code: string;
  title: string;
  target: number;
  progress: number;
  reward_xp: number;
  completed_at: string | null;
};

type StatsRow = {
  streak_days: number;
  active_days: number;
  last_activity_date: string | null;
  last_checked_date: string | null;
};

// ---------- Utils dates ----------
export function formatDateYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getYesterdayYYYYMMDD(todayYYYYMMDD: string) {
  const d = new Date(`${todayYYYYMMDD}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return formatDateYYYYMMDD(d);
}

// ---------- XP helper (anti double) ----------
async function grantXpOnce(action: string, refId: number, xp: number) {
  // 1) on enregistre l’événement XP (si déjà existant => doublon)
  try {
    await runSql(
      `INSERT INTO xp_events (action, ref_id, xp) VALUES (?, ?, ?)`,
      [action, refId, xp],
    );
  } catch {
    // Doublon => XP déjà donné
    return null;
  }

  // 2) on ajoute au profil
  const row = await getOne<{ xp_total: number }>(
    `SELECT xp_total FROM user_profile WHERE id = 1`,
  );
  const xpTotal = (row?.xp_total ?? 0) + xp;
  const info = getLevelInfo(xpTotal);

  await runSql(`UPDATE user_profile SET xp_total = ?, level = ? WHERE id = 1`, [
    xpTotal,
    info.level,
  ]);

  return info; // utile si tu veux afficher un toast "level up"
}

// =====================================================
// 1) updateStreak(today)
//    Appelé à chaque ajout de transaction.
//    Met à jour streak_days, active_days et last_activity_date.
// =====================================================
export async function updateStreak(todayYYYYMMDD: string) {
  const profile = await getOne<{
    streak_days: number;
    active_days: number;
    last_activity_date: string | null;
  }>(
    `SELECT streak_days, active_days, last_activity_date FROM user_profile WHERE id = 1`,
  );

  const last = profile?.last_activity_date ?? null;
  const streak = profile?.streak_days ?? 0;
  const activeDays = profile?.active_days ?? 0;

  // Déjà compté aujourd’hui → pas de changement
  if (last === todayYYYYMMDD) {
    return { streak_days: streak, changed: false };
  }

  let nextStreak = 1;
  let nextActiveDays = activeDays + 1;

  if (last) {
    const daysDiff = diffDays(
      new Date(`${todayYYYYMMDD}T00:00:00`),
      new Date(`${last}T00:00:00`),
    );
    if (daysDiff === 1) {
      // Jour consécutif → on incrémente
      nextStreak = streak + 1;
    } else if (daysDiff === 0) {
      // Même jour (ne devrait pas arriver ici, mais sécurité)
      nextStreak = streak;
      nextActiveDays = activeDays;
    } else {
      // Plus d’1 jour d’écart → streak reset à 1
      nextStreak = 1;
    }
  }

  await runSql(
    `UPDATE user_profile SET streak_days = ?, active_days = ?, last_activity_date = ? WHERE id = 1`,
    [nextStreak, nextActiveDays, todayYYYYMMDD],
  );

  return { streak_days: nextStreak, changed: true };
}

// =====================================================
// 2) ensureDailyMissionsForToday(today)
// =====================================================
export async function ensureDailyMissionsForToday(todayYYYYMMDD: string) {
  // Missions simples (tu peux changer les titres/rewards)
  const missions = [
    {
      code: "ADD_1_TX",
      title: "Ajouter 1 transaction",
      target: 1,
      reward_xp: 10,
    },
    {
      code: "ADD_3_TX",
      title: "Ajouter 3 transactions",
      target: 3,
      reward_xp: 25,
    },
    {
      code: "ADD_1_SAVING",
      title: "Ajouter 1 épargne",
      target: 1,
      reward_xp: 15,
    },
  ] as const;

  for (const m of missions) {
    await runSql(
      `INSERT OR IGNORE INTO daily_missions (date, code, title, target, progress, reward_xp)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [todayYYYYMMDD, m.code, m.title, m.target, m.reward_xp],
    );
  }
}

// =====================================================
// 3) progressMission(today, code, amount)
// =====================================================
export async function progressMission(
  todayYYYYMMDD: string,
  code: string,
  amount: number = 1,
) {
  const mission = await getOne<MissionRow>(
    `SELECT * FROM daily_missions WHERE date = ? AND code = ?`,
    [todayYYYYMMDD, code],
  );

  if (!mission) return null;

  // déjà complétée => rien
  if (mission.completed_at) return mission;

  const nextProgress = Math.min(mission.target, mission.progress + amount);

  await runSql(`UPDATE daily_missions SET progress = ? WHERE id = ?`, [
    nextProgress,
    mission.id,
  ]);

  // Si pas atteint => stop
  if (nextProgress < mission.target) {
    return { ...mission, progress: nextProgress };
  }

  // Atteint => on marque complet + on donne XP (une seule fois)
  await runSql(
    `UPDATE daily_missions SET completed_at = datetime('now') WHERE id = ? AND completed_at IS NULL`,
    [mission.id],
  );

  // XP mission (anti double grâce à xp_events UNIQUE(action, ref_id))
  //   await grantXpOnce("DAILY_MISSION", mission.id, mission.reward_xp);
  await reward("DAILY_MISSION", mission.id);

  // renvoyer mission “à jour”
  const updated = await getOne<MissionRow>(
    `SELECT * FROM daily_missions WHERE id = ?`,
    [mission.id],
  );

  return updated;
}

// =====================================================
// 4) updateDailyMissions(today, action)
// =====================================================
export async function updateDailyMissions(
  todayYYYYMMDD: string,
  action: XpAction,
) {
  // 1) s’assurer que les missions existent
  await ensureDailyMissionsForToday(todayYYYYMMDD);

  // 2) avancer les missions pertinentes
  if (action === "ADD_EXPENSE" || action === "ADD_INCOME") {
    await progressMission(todayYYYYMMDD, "ADD_1_TX", 1);
    await progressMission(todayYYYYMMDD, "ADD_3_TX", 1);
  }

  if (action === "ADD_SAVING") {
    await progressMission(todayYYYYMMDD, "ADD_1_SAVING", 1);
  }
}

async function hasAnyTransactionOnDate(day: string): Promise<boolean> {
  const row = await getOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions WHERE date = ?`,
    [day],
  );
  return (row?.count ?? 0) > 0;
}

/**
 * updateActivityAndStreak()
 * Appelé au démarrage de l’app et après un ajout d’épargne.
 *
 * Rôle : vérifier si l’utilisateur a été actif aujourd’hui (transaction existante).
 *   - Si OUI  → mettre à jour streak + active_days + last_activity_date
 *   - Si NON  → NE PAS casser le streak tout de suite.
 *               Le streak ne sera cassé que lorsqu’une nouvelle activité arrive
 *               un jour non-consécutif (géré par updateStreak()).
 *               On met juste à jour last_checked_date pour ne pas re-checker.
 *
 * Avant ce fix, la fonction remettait le streak à 0 dès le démarrage de l’app
 * si aucune transaction n’existait encore aujourd’hui, AVANT même que
 * l’utilisateur ait eu le temps d’en ajouter une.
 */
export async function updateActivityAndStreak(todayISO?: string) {
  const today = todayISO ?? formatDateYYYYMMDD(new Date());

  const stats = await getOne<StatsRow>(
    `SELECT streak_days, active_days, last_activity_date, last_checked_date FROM user_profile WHERE id = 1`,
  );
  if (!stats) return null;

  const { streak_days, active_days, last_activity_date: last_active, last_checked_date: last_checked } = stats;

  // Déjà vérifié aujourd’hui → retourner les vraies valeurs
  if (last_checked === today) {
    return stats;
  }

  const didTxToday = await hasAnyTransactionOnDate(today);

  if (!didTxToday) {
    // Pas encore de transaction aujourd’hui.
    // On ne casse PAS le streak ici — l’utilisateur a peut-être
    // juste pas encore ajouté de transaction.
    // On enregistre seulement qu’on a vérifié.
    await runSql(
      `UPDATE user_profile SET last_checked_date = ? WHERE id = 1`,
      [today],
    );
    return { ...stats, last_checked_date: today };
  }

  // Il y a déjà une transaction aujourd’hui → mettre à jour streak & active_days
  let nextStreak = 1;
  let nextActiveDays = active_days;

  if (last_active !== today) {
    nextActiveDays = (active_days ?? 0) + 1;
  }

  if (!last_active) {
    nextStreak = 1;
  } else {
    const daysDiff = diffDays(
      new Date(`${today}T00:00:00`),
      new Date(`${last_active}T00:00:00`),
    );
    if (daysDiff === 1) {
      nextStreak = streak_days + 1;
    } else if (daysDiff === 0) {
      nextStreak = streak_days; // même jour
    } else {
      nextStreak = 1; // streak cassé (>1 jour sans activité)
    }
  }

  await runSql(
    `UPDATE user_profile SET streak_days = ?, active_days = ?, last_activity_date = ?, last_checked_date = ? WHERE id = 1`,
    [nextStreak, nextActiveDays, today, today],
  );

  return getOne<StatsRow>(
    `SELECT streak_days, active_days, last_activity_date, last_checked_date FROM user_profile WHERE id = 1`,
  );
}
