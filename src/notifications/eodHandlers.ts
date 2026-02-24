import { autoCheckNoSpendDay } from "@/src/services/missions/noSpendDay";
import * as Notifications from "expo-notifications";

export function registerEODNotificationListener(minWeekly: number) {
  return Notifications.addNotificationResponseReceivedListener(async (res) => {
    const kind = res.notification.request.content.data?.kind;
    if (kind !== "EOD_CHECK") return;

    // ✅ validation "jour terminé"
    await autoCheckNoSpendDay(minWeekly);
  });
}
