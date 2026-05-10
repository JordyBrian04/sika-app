/**
 * Singleton de devise globale.
 * Permet à formatWithCurrency() d'être utilisé hors d'un composant React.
 * Mis à jour par CurrencyContext au démarrage et à chaque changement.
 */

import type { Currency } from "./currencyService";

type RatesMap = Record<Currency, number>;

let _currency: Currency = "XOF";
let _rates: RatesMap = { XOF: 1, XAF: 1, USD: 600, EUR: 655.96 };
let _symbol = "FCFA";

export function setCurrencyStore(currency: Currency, rates: RatesMap) {
  _currency = currency;
  _rates    = rates;
  _symbol   = currency === "XOF" || currency === "XAF" ? "FCFA"
              : currency === "USD" ? "$"
              : currency === "EUR" ? "€"
              : currency;
}

/**
 * Convertit un montant FCFA vers la devise globale et le formate.
 * - FCFA/XAF : arrondi à l'entier (pas de centimes en FCFA)
 * - USD/EUR  : 2 décimales (centimes supportés)
 * Le montant stocké en DB peut maintenant être décimal.
 */
export function formatWithCurrency(fcfaAmount: number): string {
  if (_currency === "XOF" || _currency === "XAF") {
    // FCFA n'a pas de centimes — arrondi à l'entier
    return `${Math.round(fcfaAmount).toLocaleString("fr-FR")} ${_symbol}`;
  }
  const rate = _rates[_currency] ?? 1;
  const converted = fcfaAmount / rate;
  const decimals = _currency === "USD" || _currency === "EUR" ? 2 : 0;
  return `${converted.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ${_symbol}`;
}

export function getCurrency(): Currency { return _currency; }
export function getSymbol(): string    { return _symbol; }
export function getRates(): RatesMap   { return _rates; }
