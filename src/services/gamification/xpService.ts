import { getOne, runSql } from "../../db";
import { useToastStore } from "../../state/toastStore";

export type LevelInfo = {
  level: number;
  xpTotal: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  levelStartXp: number;
  nextLevelStartXp: number;
  gender?: string;
  name?: string;
};

const LEVEL_THRESHOLDS = [0, 50, 120, 250, 450, 700, 1000, 1400, 1900, 2500];

function levelFromXp(xp: number) {
  // seuils simples
  if (xp >= 1000) return 8;
  if (xp >= 700) return 7;
  if (xp >= 500) return 6;
  if (xp >= 350) return 5;
  if (xp >= 250) return 4;
  if (xp >= 100) return 3;
  if (xp >= 50) return 2;
  return 1;
}

function thresholdForLevel(level: number) {
  if (level <= 1) return LEVEL_THRESHOLDS[0];
  if (level - 1 < LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[level - 1];

  // au-delà, on continue avec une progression (+600, +700, +800...)
  const last = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const extraLevel = level - LEVEL_THRESHOLDS.length;
  return last + extraLevel * (500 + extraLevel * 50);
}

// export async function addXp(amount: number, reason?: string) {
//   const row = await getOne<{ xp: number; level: number }>(
//     "SELECT xp, level FROM user_profile WHERE id = 1",
//   );
//   const prevXp = row?.xp ?? 0;
//   const prevLevel = row?.level ?? 1;

//   const nextXp = prevXp + amount;
//   const nextLevel = levelFromXp(nextXp);

//   await runSql("UPDATE user_profile SET xp = ?, level = ? WHERE id = 1", [
//     nextXp,
//     nextLevel,
//   ]);

//   if (reason) {
//     useToastStore.getState().show(`+${amount} XP`, reason, "info");
//   }

//   if (nextLevel > prevLevel) {
//     useToastStore
//       .getState()
//       .show(`🎉 Niveau ${nextLevel} !`, "Tu progresses bien 💪", "badge");
//   }
// }

export async function addXp(xpToAdd: number): Promise<LevelInfo> {
  const current = await getOne<{ xp: number; gender?: string; name?: string }>(
    "SELECT * FROM user_profile WHERE id = 1",
  );

  const xpTotal = (current?.xp ?? 0) + xpToAdd;
  const info = getLevelInfo(xpTotal, {
    gender: current?.gender,
    name: current?.name,
  });

  await runSql("UPDATE user_profile SET xp = ?, level = ? WHERE id = 1", [
    xpTotal,
    info.level,
  ]);

  return info;
}

export function getLevelInfo(
  xpTotal: number,
  row?: { gender?: string; name?: string },
): LevelInfo {
  let level = 1;
  while (xpTotal >= thresholdForLevel(level + 1)) level++;

  const levelStartXp = thresholdForLevel(level);
  const nextLevelStartXp = thresholdForLevel(level + 1);

  return {
    level,
    xpTotal,
    levelStartXp,
    nextLevelStartXp,
    xpIntoLevel: xpTotal - levelStartXp,
    xpForNextLevel: nextLevelStartXp - levelStartXp,
    gender: row?.gender,
    name: row?.name,
  };
}

export async function getProfile(): Promise<LevelInfo> {
  const row = await getOne<{
    xp: number;
    level: number;
    gender?: string;
    name?: string;
  }>("SELECT * FROM user_profile WHERE id = 1");
  const xpTotal = row?.xp ?? 0;
  return getLevelInfo(xpTotal, { gender: row?.gender, name: row?.name });
}

export type XpAction =
  | "ADD_EXPENSE"
  | "ADD_INCOME"
  | "CREATE_BUDGET"
  | "ADD_RECURRING"
  | "CREATE_GOAL"
  | "ADD_SAVING"
  | "MONTH_OK"
  | "DAILY_MISSION";

const XP: Record<XpAction, { amount: number; label: string }> = {
  ADD_EXPENSE: { amount: 5, label: "Dépense ajoutée" },
  ADD_INCOME: { amount: 3, label: "Revenu ajouté" },
  CREATE_BUDGET: { amount: 15, label: "Budget créé" },
  ADD_RECURRING: { amount: 10, label: "Paiement récurrent ajouté" },
  CREATE_GOAL: { amount: 10, label: "Objectif d’épargne créé" },
  ADD_SAVING: { amount: 5, label: "Épargne ajoutée" },
  MONTH_OK: { amount: 60, label: "Budget respecté ce mois-ci" },
  DAILY_MISSION: { amount: 10, label: "Mission quotidienne complétée" },
};

export async function reward(action: XpAction, refId?: number) {
  const { amount, label } = XP[action];

  try {
    await runSql(
      `INSERT INTO xp_events (action, ref_id, xp)
       VALUES (?, ?, ?)`,
      [action, refId ?? null, amount],
    );
  } catch (e) {
    // doublon → déjà donné
    return null;
  }

  const before = await addXp(0); // info actuelle
  const after = await addXp(amount);

  // toast +XP
  useToastStore.getState().show(`+${amount} XP`, label, "info");

  // level up ?
  if (after.level > before.level) {
    useToastStore
      .getState()
      .show(
        `🎉 Niveau ${after.level} !`,
        "Tu progresses vraiment bien 💪",
        "badge",
      );
  }

  return after;
}
