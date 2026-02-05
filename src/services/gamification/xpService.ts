import { getOne, runSql } from "../../db";
import { useToastStore } from "../../state/toastStore";

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

export async function addXp(amount: number, reason?: string) {
  const row = await getOne<{ xp: number; level: number }>(
    "SELECT xp, level FROM user_profile WHERE id = 1",
  );
  const prevXp = row?.xp ?? 0;
  const prevLevel = row?.level ?? 1;

  const nextXp = prevXp + amount;
  const nextLevel = levelFromXp(nextXp);

  await runSql("UPDATE user_profile SET xp = ?, level = ? WHERE id = 1", [
    nextXp,
    nextLevel,
  ]);

  if (reason) {
    useToastStore.getState().show(`+${amount} XP`, reason, "info");
  }

  if (nextLevel > prevLevel) {
    useToastStore
      .getState()
      .show(`🎉 Niveau ${nextLevel} !`, "Tu progresses bien 💪", "badge");
  }
}

export async function getProfile() {
  return getOne<{ xp: number; level: number }>(
    "SELECT xp, level FROM user_profile WHERE id = 1",
  );
}
