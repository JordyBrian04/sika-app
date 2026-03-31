import * as Notifications from "expo-notifications";
import { EOD_CHANNEL_ID } from "./channels";

export const EOD_CATEGORY = "EOD_CATEGORY";

export async function setupEODCategory() {
  await Notifications.setNotificationCategoryAsync(EOD_CATEGORY, [
    {
      identifier: "EOD_CHECK",
      buttonTitle: "Vérifier maintenant",
      options: { opensAppToForeground: true },
    },
  ]);
}

const EOD_NOTIFICATION_ID_KEY = "EOD_NOTIFICATION_ID";

export async function scheduleEndOfDayNotification(hour = 22, minute = 0) {
  // on supprime l'ancienne si elle existe (optionnel)
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const eod = existing.find((n) => n.content.data?.kind === "EOD_CHECK");
  if (eod?.identifier) {
    await Notifications.cancelScheduledNotificationAsync(eod.identifier);
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Fin de journée",
      body: "On vérifie si tu as réussi une journée sans dépense ✅",
      categoryIdentifier: EOD_CATEGORY,
      data: { kind: "EOD_CHECK" },
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: EOD_CHANNEL_ID,
    },
  });
}
