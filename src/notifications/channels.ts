import * as Notifications from "expo-notifications";

export const EOD_CHANNEL_ID = "eod";

export async function ensureAndroidChannels() {
  await Notifications.setNotificationChannelAsync(EOD_CHANNEL_ID, {
    name: "Rappels fin de journée",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#265ED7",
  });
}
