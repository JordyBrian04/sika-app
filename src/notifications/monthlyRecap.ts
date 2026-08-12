/**
 * Bilan mensuel — notification envoyée le dernier jour du mois à 22h.
 *
 * Deux messages possibles :
 *  - Comparaison vs mois précédent : "+12 500 FCFA économisés vs le mois dernier 🎉"
 *  - Dépassements budget : "Attention : tu as dépassé 3 budgets ce mois-ci."
 *
 * Déclenchement :
 *  - Via le handler EOD (22h, si l'user tape la notif fin de journée)
 *  - Via le lancement de l'app le dernier jour du mois
 *
 * Anti-doublon : clé MMKV "monthly_recap_sent" = "YYYY-MM" du mois en cours.
 */

import * as Notifications from "expo-notifications";
import { MMKV } from "react-native-mmkv";
import { all, getOne } from "@/src/db";
import { MONTHLY_CHANNEL_ID } from "./channels";

const storage = new MMKV({ id: "monthly-recap" });
const RECAP_KEY = "monthly_recap_sent";

// ─── Helpers date ─────────────────────────────────────────────────────────────

function isLastDayOfMonth(): boolean {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return tomorrow.getMonth() !== today.getMonth();
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function alreadySentThisMonth(): boolean {
  return storage.getString(RECAP_KEY) === currentMonthKey();
}

function markSentThisMonth(): void {
  storage.set(RECAP_KEY, currentMonthKey());
}

function formatFCFA(amount: number): string {
  return Math.abs(amount).toLocaleString("fr-FR") + " FCFA";
}

// ─── Calculs mensuels ─────────────────────────────────────────────────────────

type MonthStats = {
  income: number;
  expense: number;
  savings: number;
  net: number;
  budgetsOver: number;
};

async function getStatsForMonth(month: number, year: number): Promise<MonthStats> {
  const mm = String(month).padStart(2, "0");
  const yyyy = String(year);

  const txRow = await getOne<{ income: number; expense: number }>(
    `SELECT
      COALESCE(SUM(CASE WHEN type = 'entree' THEN amount END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'depense' THEN amount END), 0) as expense
     FROM transactions
     WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?
       AND deleted_at IS NULL`,
    [mm, yyyy]
  );

  const savRow = await getOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM goal_contributions
     WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?`,
    [mm, yyyy]
  );

  const budgets = await all<{ limit_amount: number; category_id: number }>(
    `SELECT limit_amount, category_id FROM budgets WHERE month = ? AND year = ?`,
    [month, year]
  );

  let budgetsOver = 0;
  for (const b of budgets) {
    const spent = await getOne<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE category_id = ? AND type = 'depense'
         AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
         AND deleted_at IS NULL`,
      [b.category_id, mm, yyyy]
    );
    if ((spent?.total ?? 0) > b.limit_amount) budgetsOver++;
  }

  const income  = txRow?.income  ?? 0;
  const expense = txRow?.expense ?? 0;
  const savings = savRow?.total  ?? 0;
  return { income, expense, savings, net: income - expense - savings, budgetsOver };
}

// ─── Construction du message ──────────────────────────────────────────────────

async function buildRecapMessage(): Promise<{ title: string; body: string } | null> {
  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear  = now.getFullYear();

  // Mois précédent
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = lastMonthDate.getMonth() + 1;
  const lastYear  = lastMonthDate.getFullYear();

  const [current, previous] = await Promise.all([
    getStatsForMonth(thisMonth, thisYear),
    getStatsForMonth(lastMonth, lastYear),
  ]);

  const messages: string[] = [];

  // 1. Comparaison vs mois précédent
  const diff = current.net - previous.net;
  if (previous.net !== 0 || current.net !== 0) {
    if (diff > 0) {
      messages.push(`+${formatFCFA(diff)} économisés vs le mois dernier 🎉`);
    } else if (diff < 0) {
      messages.push(`${formatFCFA(diff)} de moins économisés vs le mois dernier 📉`);
    } else {
      messages.push(`Même bilan que le mois dernier.`);
    }
  }

  // 2. Dépassements budget
  if (current.budgetsOver > 0) {
    const label = current.budgetsOver === 1
      ? "tu as dépassé 1 budget ce mois-ci."
      : `tu as dépassé ${current.budgetsOver} budgets ce mois-ci.`;
    messages.push(`⚠️ Attention : ${label}`);
  }

  if (messages.length === 0) return null;

  // Titre selon la situation globale
  const title = diff >= 0 && current.budgetsOver === 0
    ? "Bilan du mois 🏆"
    : current.budgetsOver > 0
    ? "Bilan du mois ⚠️"
    : "Bilan du mois";

  return { title, body: messages.join(" • ") };
}

// ─── Envoi ────────────────────────────────────────────────────────────────────

async function sendMonthlyRecap(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: "default",
      data: { kind: "MONTHLY_RECAP" },
    },
    trigger: {
      seconds: 2,
      channelId: MONTHLY_CHANNEL_ID,
    } as Notifications.TimeIntervalTriggerInput,
  });
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

/**
 * Appeler depuis le handler EOD ET au lancement de l'app.
 * Ne fait rien si : pas le dernier jour du mois, ou déjà envoyé ce mois-ci.
 */
export async function checkAndSendMonthlyRecap(): Promise<void> {
  try {
    if (!isLastDayOfMonth()) return;
    if (alreadySentThisMonth()) return;

    const recap = await buildRecapMessage();
    if (!recap) return;

    await sendMonthlyRecap(recap.title, recap.body);
    markSentThisMonth();
  } catch (e) {
    console.warn("[monthlyRecap] erreur:", e);
  }
}
