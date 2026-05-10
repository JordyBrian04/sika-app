/**
 * Alertes budgétaires intelligentes — fonctionnalité Pro.
 *
 * checkBudgetThresholdAlerts : seuils 80% ET 100% (franchissement détecté)
 * checkUnusualExpenseAlert   : dépense > 2x la moyenne de la catégorie
 * checkSpendingPaceAlerts    : projection de dépassement à mi-mois
 *
 * Toutes les alertes sont envoyées en push local (expo-notifications).
 * Elles ne se déclenchent que si l'utilisateur a le plan Pro.
 */

import * as Notifications from "expo-notifications";
import { all, getOne } from "../db";
import { BUDGET_CHANNEL_ID } from "./channels";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function isPro(): Promise<boolean> {
  const row = await getOne<{ plan: string | null; plan_expires_at: string | null }>(
    `SELECT plan, plan_expires_at FROM user_profile WHERE id = 1`
  );
  if (row?.plan !== "pro") return false;
  if (row.plan_expires_at) return new Date(row.plan_expires_at) > new Date();
  return true;
}

function formatFCFA(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA";
}

function daysLeftInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate();
}

async function sendBudgetNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: "default",
      data: { kind: "BUDGET_ALERT" },
    },
    trigger: null, // immediat
  });
}

// ── 1. Alertes seuils 80 % et 100 % ──────────────────────────────────────────

/**
 * Detecte le franchissement des seuils 80% et 100% apres une depense.
 *
 * On compare ratio AVANT (total - txAmount) et APRES (total) la transaction.
 * Une alerte ne se declenche QUE si on FRANCHIT le seuil — evite le spam.
 *
 * Exemples :
 *   50% → 85%  : alerte 80 %
 *   50% → 110% : alerte 80 % ET 100 %  (les deux franchis d'un coup)
 *   85% → 95%  : rien  (deja au-dessus de 80%, pas encore a 100%)
 *   95% → 120% : alerte 100 %
 *   120% → 130%: rien  (deja depasse)
 */
export async function checkBudgetThresholdAlerts(
  categoryId: number,
  categoryName: string,
  txAmount: number,
  month: number,
  year: number
): Promise<void> {
  if (!(await isPro())) return;

  const budget = await getOne<{ limit_amount: number }>(
    `SELECT limit_amount FROM budgets
     WHERE category_id = ? AND month = ? AND year = ?`,
    [categoryId, month, year]
  );
  if (!budget || budget.limit_amount <= 0) return;

  // Total APRES insertion (transaction deja en DB)
  const spent = await getOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE category_id = ?
       AND type = 'depense'
       AND strftime('%m', date) = printf('%02d', ?)
       AND strftime('%Y', date) = ?
       AND deleted_at IS NULL`,
    [categoryId, month, String(year)]
  );
  if (!spent) return;

  const totalAfter  = spent.total;
  const totalBefore = Math.max(0, totalAfter - txAmount);
  const limit       = budget.limit_amount;
  const ratioBefore = totalBefore / limit;
  const ratioAfter  = totalAfter  / limit;

  // Seuil 80 %
  if (ratioBefore < 0.8 && ratioAfter >= 0.8) {
    const remaining = Math.max(0, limit - totalAfter);
    const daysLeft  = daysLeftInMonth();
    await sendBudgetNotification(
      `⚠️ Budget ${categoryName} a ${Math.round(ratioAfter * 100)} %`,
      remaining > 0
        ? `Il te reste ${formatFCFA(remaining)} sur ce budget${daysLeft > 0 ? ` pour les ${daysLeft} prochains jours` : " aujourd'hui"}.`
        : `Tu as utilise ${formatFCFA(totalAfter)} sur ${formatFCFA(limit)}.`
    );
  }

  // Seuil 100 %
  if (ratioBefore < 1.0 && ratioAfter >= 1.0) {
    const excess = totalAfter - limit;
    const pct    = Math.round(ratioAfter * 100);
    await sendBudgetNotification(
      `🚨 Budget ${categoryName} depasse !`,
      `${pct}% utilise — tu depasses de ${formatFCFA(excess)} (${formatFCFA(totalAfter)} / ${formatFCFA(limit)}).`
    );
  }
}

// Aliases vides conserves pour que les anciens imports compilent
export async function checkBudget80Alert(): Promise<void> {}
export async function checkBudgetExceededAlert(): Promise<void> {}

// ── 2. Alerte depense inhabituelle ────────────────────────────────────────────

/**
 * Declenche si la depense depasse 2x la moyenne des 3 derniers mois.
 */
export async function checkUnusualExpenseAlert(
  categoryId: number,
  categoryName: string,
  amount: number
): Promise<void> {
  if (!(await isPro())) return;

  const avgRow = await getOne<{ avg: number; count: number }>(
    `SELECT AVG(amount) as avg, COUNT(*) as count
     FROM transactions
     WHERE category_id = ?
       AND type = 'depense'
       AND date >= date('now', '-3 months')
       AND deleted_at IS NULL`,
    [categoryId]
  );

  if (!avgRow || avgRow.count < 3 || avgRow.avg <= 0) return;

  if (amount >= avgRow.avg * 2) {
    await sendBudgetNotification(
      `🚨 Depense inhabituelle en ${categoryName}`,
      `Depense de ${formatFCFA(amount)} en ${categoryName} — inhabituellement eleve (moyenne : ${formatFCFA(Math.round(avgRow.avg))}).`
    );
  }
}

// ── 3. Alerte rythme de depense (mi-mois) ─────────────────────────────────────

/**
 * A appeler depuis le handler EOD chaque jour (jours 14-16 du mois uniquement).
 * Projette les depenses jusqu'a fin de mois pour chaque budget.
 */
export async function checkSpendingPaceAlerts(): Promise<void> {
  if (!(await isPro())) return;

  const today      = new Date();
  const dayOfMonth = today.getDate();
  if (dayOfMonth < 14 || dayOfMonth > 16) return;

  const month = today.getMonth() + 1;
  const year  = today.getFullYear();
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const daysLeft = totalDaysInMonth - dayOfMonth;

  const budgets = await all<{ category_id: number; category_name: string; limit_amount: number }>(
    `SELECT b.category_id, c.name as category_name, b.limit_amount
     FROM budgets b
     LEFT JOIN categories c ON c.id = b.category_id
     WHERE b.month = ? AND b.year = ?`,
    [month, year]
  );

  for (const budget of budgets) {
    const spent = await getOne<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE category_id = ?
         AND type = 'depense'
         AND strftime('%m', date) = printf('%02d', ?)
         AND strftime('%Y', date) = ?
         AND deleted_at IS NULL`,
      [budget.category_id, month, String(year)]
    );

    if (!spent || spent.total <= 0) continue;

    const dailyRate    = spent.total / dayOfMonth;
    const projectedEnd = spent.total + dailyRate * daysLeft;

    if (projectedEnd > budget.limit_amount) {
      const overshoot = Math.round(projectedEnd - budget.limit_amount);
      await sendBudgetNotification(
        `📈 Rythme eleve en ${budget.category_name}`,
        `Au rythme actuel, tu depasseras ton budget ${budget.category_name} de ${formatFCFA(overshoot)} d'ici fin du mois.`
      );
    }
  }
}
