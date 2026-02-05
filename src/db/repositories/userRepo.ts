import { all, runSql } from "../index";

export type UserProfile = {
  id: number;
  pass: string;
  level: number;
  xp: number;
  name: string;
};

export function getUserProfile(): Promise<UserProfile[] | null> {
  return all<UserProfile>(`SELECT * FROM user_profile WHERE id = 1`);
}

export async function createOrUpdateUserProfile(
  pass: string,
  name: string,
): Promise<void> {
  const existing = await getUserProfile();
  if (existing && existing.length > 0) {
    await runSql(`UPDATE user_profile SET pass = ?, name = ? WHERE id = 1`, [
      pass,
      name,
    ]);
  } else {
    await runSql(`INSERT INTO user_profile (id, pass, name) VALUES (1, ?, ?)`, [
      pass,
      name,
    ]);
  }
}
