import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { all, getOne, runSql } from "../db";
import { addDays, fromYYYYMMDD } from "../utils/date";

export const RECURRING_CATEGORY_ID = "RECURRING_PAYMENT";

export async function setupRecurringNotificationCategory() {
  await Notifications.setNotificationCategoryAsync(RECURRING_CATEGORY_ID, [
    {
      identifier: "PAY",
      buttonTitle: "Payé ✅",
      options: { opensAppToForeground: true },
    },
    {
      identifier: "SKIP",
      buttonTitle: "Reporter ⏭️",
      options: { opensAppToForeground: true },
    },
  ]);
}

// Android: demande permissions + channel
export async function ensureNotificationPermissions() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    await Notifications.requestPermissionsAsync();
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("recurring", {
      name: "Rappels paiements",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

type ScheduleInput = {
  recurringId: number;
  name: string;
  amount: number;
  nextDate: string; // YYYY-MM-DD
  remindDaysBefore: number; // ex 2
};

// stocke/maj notification_id dans recurring_notification_links
async function upsertNotificationLink(
  recurringId: number,
  kind: "before" | "due",
  notifId: string,
) {
  await runSql(
    `INSERT INTO recurring_notification_links (recurring_id, kind, notification_id)
     VALUES (?, ?, ?)
     ON CONFLICT(recurring_id, kind) DO UPDATE SET notification_id = excluded.notification_id`,
    [recurringId, kind, notifId],
  );
}

async function getNotificationLink(
  recurringId: number,
  kind: "before" | "due",
) {
  return getOne<{ notification_id: string }>(
    `SELECT notification_id FROM recurring_notification_links WHERE recurring_id=? AND kind=?`,
    [recurringId, kind],
  );
}

export async function cancelRecurringNotifications(recurringId: number) {
  const before = await getNotificationLink(recurringId, "before");
  const due = await getNotificationLink(recurringId, "due");

  if (before?.notification_id) {
    await Notifications.cancelScheduledNotificationAsync(
      before.notification_id,
    );
  }
  if (due?.notification_id) {
    await Notifications.cancelScheduledNotificationAsync(due.notification_id);
  }

  await runSql(
    `DELETE FROM recurring_notification_links WHERE recurring_id = ?`,
    [recurringId],
  );
}

export async function scheduleRecurringNotifications(input: ScheduleInput) {
  // annule les anciennes si existantes
  await cancelRecurringNotifications(input.recurringId);

  const next = fromYYYYMMDD(input.nextDate);
  const remindDate = addDays(next, -Math.max(0, input.remindDaysBefore));

  // J-2 (ou remind_days_before)
  if (remindDate.getTime() > Date.now()) {
    const idBefore = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Paiement à venir",
        body: `${input.name} • ${input.amount} FCFA (dans ${input.remindDaysBefore} jours)`,
        categoryIdentifier: RECURRING_CATEGORY_ID,
        data: { recurringId: input.recurringId, kind: "before" },
      },
      trigger: { date: remindDate, channelId: "recurring" } as any,
    });
    await upsertNotificationLink(input.recurringId, "before", idBefore);
  }

  // Jour J
  if (next.getTime() > Date.now()) {
    const idDue = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Paiement aujourd'hui",
        body: `${input.name} • ${input.amount} FCFA`,
        categoryIdentifier: RECURRING_CATEGORY_ID,
        data: { recurringId: input.recurringId, kind: "due" },
      },
      trigger: { date: next, channelId: "recurring" } as any,
    });
    await upsertNotificationLink(input.recurringId, "due", idDue);
  }
}

// Re-planifier tout au lancement (sécurité)
export async function rescheduleAllActiveRecurring() {
  const rows = await all<{
    id: number;
    name: string;
    amount: number;
    next_date: string;
    remind_days_before: number;
    active: number;
  }>(
    `SELECT id, name, amount, next_date, remind_days_before, active FROM recurring_payments WHERE active=1`,
  );

  for (const r of rows) {
    await scheduleRecurringNotifications({
      recurringId: r.id,
      name: r.name,
      amount: r.amount,
      nextDate: r.next_date,
      remindDaysBefore: r.remind_days_before,
    });
  }
}
