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
