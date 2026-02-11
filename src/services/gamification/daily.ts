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
// =====================================================
export async function updateStreak(todayYYYYMMDD: string) {
  const profile = await getOne<{
    streak_days: number;
    last_activity_date: string | null;
  }>(`SELECT streak_days, last_activity_date FROM user_profile WHERE id = 1`);

  const last = profile?.last_activity_date ?? null;
  const streak = profile?.streak_days ?? 0;

  // déjà compté aujourd’hui
  if (last === todayYYYYMMDD) {
    return { streak_days: streak, changed: false };
  }

  const yesterday = getYesterdayYYYYMMDD(todayYYYYMMDD);

  let nextStreak = 1;
  if (last === yesterday) nextStreak = streak + 1;

  await runSql(
    `UPDATE user_profile SET streak_days = ?, last_activity_date = ? WHERE id = 1`,
    [nextStreak, todayYYYYMMDD],
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
