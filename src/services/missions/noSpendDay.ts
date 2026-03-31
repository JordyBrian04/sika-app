import { getOne, runSql } from "@/src/db";
import { checkNoSpendDayBadge } from "@/src/services/badges/badgeService";
import { getWeeklyPack } from "@/src/services/missions/weekly";
import { toYYYYMMDD } from "@/src/utils/date";
import { reward } from "../gamification/xpService";

type WeeklyBoost = {
  id: number;
  mission_id: number;
  code: string;
  title: string;
  description: string;
  goal_amount: number;
  progress_amount: number;
  reward_xp: number;
  reward_coins: number;
  status: "active" | "done" | "expired";
};

/**
 * True si une dépense existe ce jour là.
 * IMPORTANT: on compare sur la date "YYYY-MM-DD" (pas l'heure)
 */
export async function hasExpenseOnDate(day: string): Promise<boolean> {
  const row = await getOne<{ c: number }>(
    `
    SELECT COUNT(*) as c
    FROM transactions
    WHERE type='depense'
      AND date = ?
    `,
    [day],
  );

  return (row?.c ?? 0) > 0;
}

/**
 * Empêche la validation multiple le même jour pour le même boost.
 */
async function alreadyLogged(boostId: number, day: string): Promise<boolean> {
  const row = await getOne<{ id: number }>(
    `SELECT id FROM weekly_boost_logs WHERE boost_id=? AND day=? LIMIT 1`,
    [boostId, day],
  );
  return !!row?.id;
}

async function logBoostDay(boostId: number, day: string) {
  await runSql(
    `INSERT OR IGNORE INTO weekly_boost_logs (boost_id, day) VALUES (?, ?)`,
    [boostId, day],
  );
}

/**
 * Valide automatiquement le boost "NO_SPEND_DAY" si:
 * - boost actif
 * - aucune dépense aujourd’hui
 * - pas déjà validé aujourd’hui
 *
 * À appeler au lancement de Home / Settings / ou à chaque refresh du dashboard.
 */
export async function autoCheckNoSpendDay(minWeekly: number, cutoffHour = 22) {
  const now = new Date();
  const today = toYYYYMMDD(now);
  // const today = toYYYYMMDD(new Date());

  // si on est avant l'heure de cutoff, on check pour la veille (permet de check la journée complète)
  if (now.getHours() < cutoffHour) {
    return { ok: false, reason: "TOO_EARLY" as const, cutoffHour };
  }

  const pack = await getWeeklyPack(minWeekly);
  const boost = pack.boosts.find((b) => b.code === "BOOST_NO_SPEND_DAY") as
    | WeeklyBoost
    | undefined;

  if (!boost) return { ok: false, reason: "BOOST_NOT_FOUND" as const };
  if (boost.status !== "active")
    return { ok: false, reason: "BOOST_NOT_ACTIVE" as const };

  // évite de re-valider 2 fois le même jour
  if (await alreadyLogged(boost.id, today)) {
    return { ok: false, reason: "ALREADY_CHECKED_TODAY" as const };
  }

  const spentToday = await hasExpenseOnDate(today);

  // log la tentative du jour (même si fail) => évite spam
  await logBoostDay(boost.id, today);

  if (spentToday) {
    return { ok: false, reason: "HAS_EXPENSE_TODAY" as const };
  }

  // ✅ valide le boost
  await runSql(
    `UPDATE weekly_boosts
     SET progress_amount = ?, status='done'
     WHERE id = ?`,
    [1, boost.id],
  );

  // Rewards XP + badge
  await reward("NO_SPEND_DAY", boost.reward_xp);
  try {
    await checkNoSpendDayBadge();
  } catch (e) {
    console.warn("checkNoSpendDayBadge failed:", e);
  }

  return { ok: true, reason: "BOOST_VALIDATED" as const };
}
