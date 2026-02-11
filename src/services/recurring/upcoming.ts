import { listUpcomingRecurring } from "../../db/repositories/recurringRepo";
import { fromYYYYMMDD } from "../../utils/date";

export async function getUpcomingEvents(daysAhead = 60) {
  const rows = await listUpcomingRecurring(daysAhead);
  const now = new Date();

  return rows.map((r) => {
    const next = fromYYYYMMDD(r.next_date);
    const diffDays = Math.ceil(
      (next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    let badge: string | null = null;
    if (diffDays === 0) badge = "Aujourd'hui";
    else if (diffDays > 0 && diffDays <= r.remind_days_before)
      badge = `J-${diffDays}`;

    return {
      ...r,
      daysUntil: diffDays,
      badge,
    };
  });
}
