import { all } from "../index";

export type BadgeItem = {
  id: number;
  code: string;
  title: string;
  description: string;
  earned_at: string | null;
};

export async function listBadgesWithStatus(): Promise<BadgeItem[]> {
  return all<BadgeItem>(`
    SELECT
      b.id, b.code, b.title, b.description,
      ub.earned_at as earned_at
    FROM badges b
    LEFT JOIN user_badges ub ON ub.badge_id = b.id
    ORDER BY (ub.earned_at IS NULL) ASC, ub.earned_at DESC, b.id ASC
  `);
}
