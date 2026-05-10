import { formatWithCurrency } from "@/src/services/currency/currencyStore";

/**
 * Formate un nombre en chaîne sans symbole.
 * Affiche les décimales si le nombre en a (ex: 8.33 → "8,33", 500 → "500").
 */
export function formatMoney(v: string | number) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return "0";
  // Afficher jusqu'à 2 décimales si nécessaire
  if (n % 1 !== 0) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return Math.trunc(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * Formate un montant FCFA vers la devise globale avec décimales intelligentes.
 * - FCFA/XAF : 0 décimale (ex: "12 500 FCFA")
 * - USD/EUR  : 2 décimales (ex: "20,83 $")
 */
export function displayMoney(amount: number | string): string {
  const n = Number(amount || 0);
  if (!Number.isFinite(n)) return "0";
  return formatWithCurrency(n); // Ne tronque plus — currencyStore gère les décimales
}
