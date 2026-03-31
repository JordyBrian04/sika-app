import * as Notifications from "expo-notifications";
import { EOD_CHANNEL_ID } from "./channels";

const CLOSURE_REMINDER_KIND = "CLOSURE_REMINDER";

/**
 * Calcule le dernier jour du mois en cours (ou du mois suivant si on est déjà le dernier jour).
 * Retourne une Date au format local avec heure fixée à 20h00.
 */
function getNextLastDayOfMonth(): Date {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  // Dernier jour du mois en cours
  const lastDay = new Date(year, month + 1, 0);
  lastDay.setHours(20, 0, 0, 0);

  // Si on est déjà passé (dernier jour après 20h), planifier pour le mois suivant
  if (now >= lastDay) {
    const nextLastDay = new Date(year, month + 2, 0);
    nextLastDay.setHours(20, 0, 0, 0);
    return nextLastDay;
  }

  return lastDay;
}

/**
 * Planifie une notification de rappel de clôture pour le dernier jour du mois à 20h.
 * Annule l'ancienne notification si elle existe, puis en replanifie une nouvelle.
 * Doit être appelée au démarrage de l'app et après chaque clôture réussie.
 */
export async function scheduleClosureReminder() {
  // Annuler l'ancienne notification de clôture si elle existe
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of existing) {
    if (n.content.data?.kind === CLOSURE_REMINDER_KIND) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  const triggerDate = getNextLastDayOfMonth();
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];
  const monthName = monthNames[triggerDate.getMonth()];

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Clôture du mois",
      body: `C'est le dernier jour de ${monthName} ! Pensez à clôturer votre mois pour ajuster votre solde.`,
      data: { kind: CLOSURE_REMINDER_KIND },
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: EOD_CHANNEL_ID,
    },
  });

  console.log(
    `📅 Rappel clôture planifié pour le ${triggerDate.toLocaleDateString("fr-FR")} à 20h`,
  );
}
