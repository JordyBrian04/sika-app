import { autoCheckNoSpendDay } from "@/src/services/missions/noSpendDay";
import { checkSpendingPaceAlerts } from "@/src/notifications/budgetAlerts";
import { checkOverdueRecurringPayments } from "@/src/notifications/recurringNotifications";
import * as Notifications from "expo-notifications";

export function registerEODNotificationListener(minWeekly: number) {
  return Notifications.addNotificationResponseReceivedListener(async (res) => {
    const kind = res.notification.request.content.data?.kind;
    if (kind !== "EOD_CHECK") return;

    // ✅ validation "jour terminé"
    await autoCheckNoSpendDay(minWeekly);

    // Alerte rythme de dépense à mi-mois (Pro)
    checkSpendingPaceAlerts().catch(() => {});

    // Alerte paiements récurrents oubliés (pending depuis > 1 jour)
    const today = new Date().toISOString().substring(0, 10);
    checkOverdueRecurringPayments(today).catch(() => {});
  });
}
