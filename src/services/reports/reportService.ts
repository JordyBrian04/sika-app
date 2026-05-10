/**
 * Service de génération de rapports PDF et cartes récapitulatives.
 * Utilise expo-print (inclus dans Expo SDK 54) + expo-sharing.
 *
 * - generateMonthlyPDF()  → PDF complet (Pro)
 * - generateShareCard()   → Carte visuelle partageable (tous)
 */

// expo-print n'est pas installé par défaut — utilise expo-file-system + expo-sharing
// Pour activer le vrai PDF : npx expo install expo-print puis décommenter les lignes Print
import { all, getOne } from "@/src/db";
import { formatWithCurrency } from "@/src/services/currency/currencyStore";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";


// ── Types ──────────────────────────────────────────────────────────────────────

export type MonthlyData = {
  month: number;
  year: number;
  income: number;
  expense: number;
  net: number;
  topCategories: { name: string; total: number; type: string }[];
  budgets: { category: string; budget_limit: number; spent: number; pct: number }[];
  transactions: { date: string; note: string | null; category: string; amount: number; type: string }[];
  badgesEarned: { title: string; description: string }[];
  savings: { name: string; current: number; target: number; pct: number }[];
};


// function f(n: number) {
//   const { displayAmount, currency: globalCurrency } = useCurrency();
//   return displayAmount(n);
//   // return n.toLocaleString("fr-FR") + ` ${getSymbol()}`;
// }

function f(n: number) {
  return formatWithCurrency(n);
}

function monthName(m: number, y: number) {
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

// ── Chargement des données ────────────────────────────────────────────────────

export async function loadMonthlyData(month: number, year: number): Promise<MonthlyData> {
  // Revenus/dépenses
  const summary = await getOne<{ income: number; expense: number }>(
    `SELECT
      COALESCE(SUM(CASE WHEN type='entree' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type='depense' THEN amount ELSE 0 END), 0) as expense
     FROM transactions
     WHERE strftime('%m', date) = printf('%02d', ?)
       AND strftime('%Y', date) = ?
       AND deleted_at IS NULL`,
    [month, String(year)]
  );

  // Top catégories par dépense
  const topCategories = await all<{ name: string; total: number; type: string }>(
    `SELECT COALESCE(c.name, 'Sans catégorie') as name, SUM(t.amount) as total, t.type
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE strftime('%m', t.date) = printf('%02d', ?)
       AND strftime('%Y', t.date) = ?
       AND t.deleted_at IS NULL
     GROUP BY t.category_id, t.type
     ORDER BY total DESC
     LIMIT 8`,
    [month, String(year)]
  );

  // Budgets du mois
  const budgets = await all<{ category: string; budget_limit: number; spent: number }>(
    `SELECT COALESCE(c.name, 'Sans catégorie') as category,
            b.limit_amount as budget_limit,
            COALESCE(SUM(t.amount), 0) as spent
     FROM budgets b
     LEFT JOIN categories c ON c.id = b.category_id
     LEFT JOIN transactions t ON t.category_id = b.category_id
       AND strftime('%m', t.date) = printf('%02d', ?)
       AND strftime('%Y', t.date) = ?
       AND t.type = 'depense' AND t.deleted_at IS NULL
     WHERE b.month = ? AND b.year = ?
     GROUP BY b.id`,
    [month, String(year), month, year]
  );

  // Transactions du mois (max 50)
  const transactions = await all<{ date: string; note: string | null; category: string; amount: number; type: string }>(
    `SELECT t.date, t.note, COALESCE(c.name, '—') as category, t.amount, t.type
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE strftime('%m', t.date) = printf('%02d', ?)
       AND strftime('%Y', t.date) = ?
       AND t.deleted_at IS NULL
     ORDER BY t.date DESC, t.id DESC
     LIMIT 50`,
    [month, String(year)]
  );

  // Badges obtenus ce mois
  const badgesEarned = await all<{ title: string; description: string }>(
    `SELECT b.title, b.description
     FROM user_badges ub
     JOIN badges b ON b.id = ub.badge_id
     WHERE strftime('%m', ub.earned_at) = printf('%02d', ?)
       AND strftime('%Y', ub.earned_at) = ?`,
    [month, String(year)]
  );

  // Objectifs d'épargne
  const savings = await all<{ name: string; current: number; target: number }>(
    `SELECT name, current_amount as current, target_amount as target
     FROM saving_goals WHERE active = 1`,
  );

  const income = summary?.income ?? 0;
  const expense = summary?.expense ?? 0;

  return {
    month, year, income, expense,
    net: income - expense,
    topCategories,
    budgets: budgets.map(b => ({ ...b, pct: b.budget_limit > 0 ? Math.round((b.spent / b.budget_limit) * 100) : 0 })),
    transactions,
    badgesEarned,
    savings: savings.map(s => ({ ...s, pct: s.target > 0 ? Math.round((s.current / s.target) * 100) : 0 })),
  };
}

// ── Template HTML commun ──────────────────────────────────────────────────────

function progressBar(pct: number, color = "#265ed7"): string {
  const clamped = Math.min(100, Math.max(0, pct));
  const bg = pct > 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : color;
  return `<div style="background:#e5e7eb;border-radius:4px;height:8px;overflow:hidden">
    <div style="width:${clamped}%;background:${bg};height:100%;border-radius:4px"></div>
  </div>`;
}

// ── PDF mensuel complet ───────────────────────────────────────────────────────

function buildPdfHtml(data: MonthlyData): string {
  const netColor = data.net >= 0 ? "#16a34a" : "#dc2626";
  const depenses = data.topCategories.filter(c => c.type === "depense").slice(0, 5);

  const txRows = data.transactions.map(t => `
    <tr>
      <td>${new Date(t.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</td>
      <td>${t.category}</td>
      <td>${t.note ?? "—"}</td>
      <td style="text-align:right;color:${t.type === "entree" ? "#16a34a" : "#dc2626"};font-weight:600">
        ${t.type === "entree" ? "+" : "-"}${f(t.amount)}
      </td>
    </tr>
  `).join("");

  const budgetRows = data.budgets.map(b => `
    <tr>
      <td>${b.category}</td>
      <td style="text-align:right">${f(b.spent)}</td>
      <td style="text-align:right">${f(b.budget_limit)}</td>
      <td style="color:${b.pct > 100 ? "#dc2626" : b.pct >= 80 ? "#f59e0b" : "#16a34a"};text-align:right;font-weight:600">${b.pct}%</td>
    </tr>
  `).join("");

  const badgesList = data.badgesEarned.length > 0
    ? data.badgesEarned.map(b => `<li><strong>${b.title}</strong> — ${b.description}</li>`).join("")
    : "<li>Aucun badge ce mois-ci</li>";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1f2937; padding: 32px; font-size: 13px; }
  h1 { font-size: 22px; font-weight: 800; color: #265ed7; }
  h2 { font-size: 15px; font-weight: 700; margin: 24px 0 12px; color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  .subtitle { color: #6b7280; font-size: 13px; margin-top: 4px; }
  .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 8px; }
  .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; text-align: center; }
  .card-val { font-size: 20px; font-weight: 800; }
  .card-lbl { font-size: 11px; color: #6b7280; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f3f4f6; padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; }
  td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
  ul { padding-left: 18px; line-height: 1.8; }
  .footer { margin-top: 32px; text-align: center; color: #9ca3af; font-size: 11px; }
  .pro-badge { background: #fef08a; color: #854d0e; font-size: 10px; padding: 2px 8px; border-radius: 20px; font-weight: 700; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Sika App</h1>
      <div class="subtitle">Rapport mensuel — ${monthName(data.month, data.year)}</div>
    </div>
    <span class="pro-badge">⭐ Sika Pro</span>
  </div>

  <h2>Résumé financier</h2>
  <div class="summary-grid">
    <div class="card"><div class="card-val" style="color:#16a34a">+${f(data.income)}</div><div class="card-lbl">Revenus</div></div>
    <div class="card"><div class="card-val" style="color:#dc2626">-${f(data.expense)}</div><div class="card-lbl">Dépenses</div></div>
    <div class="card"><div class="card-val" style="color:${netColor}">${data.net >= 0 ? "+" : ""}${f(data.net)}</div><div class="card-lbl">Solde net</div></div>
  </div>

  ${data.budgets.length > 0 ? `
  <h2>Budgets du mois</h2>
  <table>
    <tr><th>Catégorie</th><th style="text-align:right">Dépensé</th><th style="text-align:right">Budget</th><th style="text-align:right">%</th></tr>
    ${budgetRows}
  </table>` : ""}

  ${depenses.length > 0 ? `
  <h2>Top dépenses par catégorie</h2>
  <table>
    <tr><th>Catégorie</th><th style="text-align:right">Total</th></tr>
    ${depenses.map(c => `<tr><td>${c.name}</td><td style="text-align:right;font-weight:600">${f(c.total)}</td></tr>`).join("")}
  </table>` : ""}

  ${data.savings.length > 0 ? `
  <h2>Objectifs d'épargne</h2>
  <table>
    <tr><th>Objectif</th><th style="text-align:right">Épargné</th><th style="text-align:right">Cible</th><th style="text-align:right">%</th></tr>
    ${data.savings.map(s => `<tr>
      <td>${s.name}</td>
      <td style="text-align:right">${f(s.current)}</td>
      <td style="text-align:right">${f(s.target)}</td>
      <td style="text-align:right;font-weight:600;color:${s.pct >= 100 ? "#16a34a" : "#265ed7"}">${s.pct}%</td>
    </tr>`).join("")}
  </table>` : ""}

  ${data.badgesEarned.length > 0 ? `
  <h2>Badges obtenus</h2>
  <ul>${badgesList}</ul>` : ""}

  <h2>Transactions du mois</h2>
  <table>
    <tr><th>Date</th><th>Catégorie</th><th>Note</th><th style="text-align:right">Montant</th></tr>
    ${txRows}
  </table>

  <div class="footer">Généré par Sika App • ${new Date().toLocaleDateString("fr-FR")} • Rapport confidentiel</div>
</body>
</html>`;
}

// ── Carte récapitulative partageable ──────────────────────────────────────────

function buildShareCardHtml(data: MonthlyData): string {
  const netColor = data.net >= 0 ? "#22c55e" : "#ef4444";
  const savingRate = data.income > 0 ? Math.round((Math.max(0, data.net) / data.income) * 100) : 0;

  const depenses = data.topCategories.filter(c => c.type === "depense").slice(0, 3);
  const catBars = depenses.map(c => `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12px;color:#cbd5e1">${c.name}</span>
        <span style="font-size:12px;color:#f1f5f9;font-weight:600">${f(c.total)}</span>
      </div>
      <div style="background:rgba(255,255,255,0.1);border-radius:3px;height:5px">
        <div style="width:${Math.min(100, Math.round((c.total / Math.max(...depenses.map(d=>d.total))) * 100))}%;background:#265ed7;height:100%;border-radius:3px"></div>
      </div>
    </div>
  `).join("");

  const badges = data.badgesEarned.slice(0, 3).map(b => `<span style="background:rgba(255,255,255,0.15);padding:4px 10px;border-radius:20px;font-size:11px;margin:3px;display:inline-block">🏆 ${b.title}</span>`).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 375px; height: 667px; background: linear-gradient(135deg, #0a0e1a 0%, #1a2235 100%); color: #f1f5f9; font-family: -apple-system, Helvetica, Arial, sans-serif; overflow: hidden; }
</style>
</head>
<body>
<div style="padding:28px 24px">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
    <div>
      <div style="font-size:22px;font-weight:800;color:#265ed7">Sika App</div>
      <div style="font-size:12px;color:#94a3b8;margin-top:2px">${monthName(data.month, data.year)}</div>
    </div>
    <div style="background:#265ed7;color:#fff;font-size:20px;font-weight:800;padding:8px 14px;border-radius:12px">
      ${data.net >= 0 ? "+" : ""}${f(data.net)}
    </div>
  </div>

  <!-- Stats -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px">
    <div style="background:rgba(255,255,255,0.07);border-radius:10px;padding:12px;text-align:center">
      <div style="font-size:14px;font-weight:700;color:#4ade80">+${data.income > 999999 ? (data.income/1000000).toFixed(1)+"M" : data.income > 999 ? Math.round(data.income/1000)+"K" : data.income}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px">Revenus</div>
    </div>
    <div style="background:rgba(255,255,255,0.07);border-radius:10px;padding:12px;text-align:center">
      <div style="font-size:14px;font-weight:700;color:#f87171">-${data.expense > 999 ? Math.round(data.expense/1000)+"K" : data.expense}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px">Dépenses</div>
    </div>
    <div style="background:rgba(255,255,255,0.07);border-radius:10px;padding:12px;text-align:center">
      <div style="font-size:14px;font-weight:700;color:#60a5fa">${savingRate}%</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px">Épargné</div>
    </div>
  </div>

  <!-- Top dépenses -->
  ${depenses.length > 0 ? `
  <div style="margin-bottom:20px">
    <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:12px;letter-spacing:1px;text-transform:uppercase">TOP DÉPENSES</div>
    ${catBars}
  </div>` : ""}

  <!-- Badges -->
  ${data.badgesEarned.length > 0 ? `
  <div style="margin-bottom:20px">
    <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px;letter-spacing:1px;text-transform:uppercase">BADGES CE MOIS</div>
    <div>${badges}</div>
  </div>` : ""}

  <!-- Footer -->
  <div style="position:absolute;bottom:24px;left:0;right:0;text-align:center;color:#475569;font-size:11px">
    Géré avec Sika App 📊 • ${new Date().toLocaleDateString("fr-FR")}
  </div>
</div>
</body>
</html>`;
}

// ── API publique ──────────────────────────────────────────────────────────────

/**
 * Génère et partage un rapport PDF mensuel complet (Pro).
 */
/**
 * Génère et partage un rapport mensuel HTML (Pro).
 * Pour générer un vrai PDF : npx expo install expo-print
 * puis remplacer FileSystem par Print.printToFileAsync.
 */
export async function generateMonthlyPDF(month: number, year: number): Promise<void> {
  const data = await loadMonthlyData(month, year);
  const html  = buildPdfHtml(data);

  const path = `${FileSystem.cacheDirectory}sika-rapport-${year}-${String(month).padStart(2, "0")}.html`;
  await FileSystem.writeAsStringAsync(path, html, { encoding: "utf8" as const });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error("Le partage n'est pas disponible.");

  await Sharing.shareAsync(path, {
    mimeType: "text/html",
    dialogTitle: `Rapport ${monthName(month, year)} — Sika`,
    UTI: "public.html",
  });
}

/**
 * Génère et partage une carte récapitulative visuelle.
 */
export async function generateShareCard(month: number, year: number): Promise<void> {
  const data = await loadMonthlyData(month, year);
  const html  = buildShareCardHtml(data);

  const path = `${FileSystem.cacheDirectory}sika-recap-${year}-${String(month).padStart(2, "0")}.html`;
  await FileSystem.writeAsStringAsync(path, html, { encoding: "utf8" as const });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error("Le partage n'est pas disponible.");

  await Sharing.shareAsync(path, {
    mimeType: "text/html",
    dialogTitle: `Mon mois de ${monthName(month, year)} 📊`,
    UTI: "public.html",
  });
}
