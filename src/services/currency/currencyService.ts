/**
 * Service de conversion de devises pour Sika App (Pro).
 *
 * Devises supportées : XOF (FCFA), XAF, USD, EUR
 * Source des taux : https://api.frankfurter.app (gratuit, pas de clé)
 * Les taux sont mis en cache dans SQLite et rafraîchis max 1x/jour.
 */

import { getOne, runSql } from "@/src/db";

export type Currency = "XOF" | "XAF" | "USD" | "EUR";

export const CURRENCY_LABELS: Record<Currency, string> = {
  XOF: "FCFA (XOF)",
  XAF: "Franc CFA BEAC (XAF)",
  USD: "Dollar américain (USD)",
  EUR: "Euro (EUR)",
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  XOF: "FCFA",
  XAF: "FCFA",
  USD: "USD",
  EUR: "EUR",
};

export const SETUP_CURRENCIES: { key: Currency; flag: string; label: string }[] = [
  { key: "XOF", flag: "🇨🇮", label: "FCFA" },
  { key: "XAF", flag: "🌍", label: "FCFA (BEAC)" },
  { key: "USD", flag: "🇺🇸", label: "Dollar ($)" },
  { key: "EUR", flag: "🇪🇺", label: "Euro (€)" },
];

// Taux de secours si l'API est inaccessible (mis à jour périodiquement)
const FALLBACK_RATES: Record<Currency, number> = {
  XOF: 1,
  XAF: 1,      // 1 XAF ≈ 1 XOF (même parité)
  USD: 600,    // 1 USD ≈ 600 XOF
  EUR: 655.96, // 1 EUR = 655.957 XOF (taux fixe officiel)
};

// ── Cache SQLite ──────────────────────────────────────────────────────────────

async function saveRates(rates: Record<Currency, number>, date: string): Promise<void> {
  try {
    const ratesJson: Record<string, { rate: number; date: string }> = {};
    for (const [k, v] of Object.entries(rates)) {
      ratesJson[k] = { rate: v, date };
    }
    await runSql(
      `UPDATE user_profile SET currency_rates = ? WHERE id = 1`,
      [JSON.stringify(ratesJson)]
    );
  } catch {
    // Non bloquant
  }
}

// ── Récupération des taux ─────────────────────────────────────────────────────

/**
 * Récupère les taux de conversion vers XOF depuis l'API Frankfurter.
 * Met en cache dans SQLite pour 24h.
 */
export async function fetchRates(): Promise<Record<Currency, number>> {
  const today = new Date().toISOString().substring(0, 10);

  // Vérifier le cache (valide si date du jour)
  try {
    const profile = await getOne<{ currency_rates: string | null }>(
      `SELECT currency_rates FROM user_profile WHERE id = 1`
    );
    if (profile?.currency_rates) {
      const cached = JSON.parse(profile.currency_rates) as Record<string, { rate: number; date: string }>;
      const usdCached = cached["USD"];
      if (usdCached?.date === today) {
        return {
          XOF: 1,
          XAF: cached["XAF"]?.rate ?? FALLBACK_RATES.XAF,
          USD: cached["USD"]?.rate ?? FALLBACK_RATES.USD,
          EUR: cached["EUR"]?.rate ?? FALLBACK_RATES.EUR,
        };
      }
    }
  } catch {
    // Ignorer, utiliser l'API
  }

  // Appeler l'API Frankfurter (XOF → USD, EUR, XAF)
  // Note : XOF = FCFA Afrique de l'Ouest
  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=XOF,XAF,EUR",
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) throw new Error("API error");
    const data = await res.json();

    // Frankfurter donne : 1 USD = X XOF
    // On veut : 1 EUR, XAF, USD exprimé en XOF
    const usdToXof = data.rates?.XOF ?? FALLBACK_RATES.USD;
    const usdToXaf = data.rates?.XAF ?? 1;
    const usdToEur = data.rates?.EUR ?? 0.92;

    const rates: Record<Currency, number> = {
      XOF: 1,
      XAF: usdToXof / usdToXaf,       // 1 XAF ≈ 1 XOF (même parité)
      USD: usdToXof,                    // 1 USD en XOF
      EUR: usdToXof / usdToEur,         // 1 EUR en XOF
    };

    await saveRates(rates, today);
    return rates;
  } catch {
    // Taux de secours
    return FALLBACK_RATES;
  }
}

/**
 * Convertit un montant d'une devise vers XOF (FCFA).
 * @param amount   montant dans la devise source
 * @param from     devise source
 * @param rates    taux (optionnel, utilise les taux de secours si absent)
 */
export function convertToFCFA(
  amount: number,
  from: Currency,
  rates?: Record<Currency, number>
): number {
  if (from === "XOF") return Math.round(amount);
  const r = rates ?? FALLBACK_RATES;
  return Math.round(amount * r[from]);
}

/**
 * Convertit XOF vers une devise cible.
 */
export function convertFromFCFA(
  amountXOF: number,
  to: Currency,
  rates?: Record<Currency, number>
): number {
  if (to === "XOF") return amountXOF;
  const r = rates ?? FALLBACK_RATES;
  return Math.round((amountXOF / r[to]) * 100) / 100;
}

/**
 * Formate un montant avec sa devise.
 */
export function formatAmount(amount: number, currency: Currency = "XOF"): string {
  if (currency === "XOF" || currency === "XAF") {
    return `${amount.toLocaleString("fr-FR")} FCFA`;
  }
  return `${amount.toLocaleString("fr-FR")} ${CURRENCY_SYMBOLS[currency]}`;
}
