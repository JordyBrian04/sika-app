import { all, runSql } from "../index";

export type UserProfile = {
  id: number;
  pass: string;
  level: number;
  xp: number;
  name: string;
  gender: string;
};

export function getUserProfile(): Promise<UserProfile[] | null> {
  return all<UserProfile>(`SELECT * FROM user_profile WHERE id = 1`);
}

export function deleteUserProfile(): Promise<void> {
  return runSql(`DELETE FROM user_profile WHERE id = 1`);
}

export async function createOrUpdateUserProfile(
  pass: string,
  name: string,
  gender: string,
): Promise<void> {
  const existing = await getUserProfile();
  if (existing && existing.length > 0) {
    await runSql(
      `UPDATE user_profile SET pass = ?, name = ?, gender = ? WHERE id = 1`,
      [pass, name, gender],
    );
  } else {
    await runSql(
      `INSERT INTO user_profile (id, pass, name, gender) VALUES (1, ?, ?, ?)`,
      [pass, name, gender],
    );
  }
}

// Ajouter une dépense : +5 XP

// Ajouter un revenu : +3 XP

// Créer un budget : +15 XP

// Ajouter une récurrence : +10 XP

// Créer un objectif épargne : +10 XP

// Ajouter une épargne : +5 XP

// Bonus “discipline”

// Budget du mois non dépassé (fin du mois) : +60 XP

// 7 jours consécutifs (au moins 1 transaction/jour) : +20 XP (optionnel)
