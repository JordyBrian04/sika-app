/**
 * CurrencyContext — Devise globale de l'application.
 *
 * Fournit :
 * - currency     : devise active (XOF | XAF | USD | EUR)
 * - symbol       : symbole affiché (FCFA, $, €...)
 * - rates        : taux de change
 * - displayAmount(fcfa) : convertit et formate un montant FCFA
 * - changeCurrency(c)   : change la devise (respecte la logique gratuit/Pro)
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getOne, runSql } from "@/src/db";
import {
  Currency,
  CURRENCY_SYMBOLS,
  fetchRates,
} from "@/src/services/currency/currencyService";
import { setCurrencyStore, formatWithCurrency } from "@/src/services/currency/currencyStore";

// ── Types ─────────────────────────────────────────────────────────────────────

type CurrencyContextValue = {
  currency: Currency;
  symbol: string;
  isLocked: boolean; // gratuit qui a déjà changé une fois
  displayAmount: (fcfa: number) => string;
  changeCurrency: (c: Currency) => Promise<void>;
  refreshCurrency: () => Promise<void>;
};

// ── Context ───────────────────────────────────────────────────────────────────

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "XOF",
  symbol: "FCFA",
  isLocked: false,
  displayAmount: (n) => `${n.toLocaleString("fr-FR")} FCFA`,
  changeCurrency: async () => {},
  refreshCurrency: async () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("XOF");
  const [symbol, setSymbol]     = useState("FCFA");
  const [isLocked, setIsLocked] = useState(false);

  const loadAndSync = useCallback(async () => {
    try {
      const row = await getOne<{ default_currency: string | null; currency_locked: number | null }>(
        `SELECT default_currency, currency_locked FROM user_profile WHERE id = 1`
      );
      const c = (row?.default_currency ?? "XOF") as Currency;
      const locked = (row?.currency_locked ?? 0) === 1;

      const rates = await fetchRates().catch(() => ({
        XOF: 1, XAF: 1, USD: 600, EUR: 655.96,
      })) as Record<Currency, number>;

      setCurrencyStore(c, rates);
      setCurrency(c);
      setSymbol(CURRENCY_SYMBOLS[c] ?? "FCFA");
      setIsLocked(locked);
    } catch {
      // Silencieux si DB pas encore prête
    }
  }, []);

  useEffect(() => { loadAndSync(); }, [loadAndSync]);

  const changeCurrency = useCallback(async (c: Currency) => {
    await runSql(
      `UPDATE user_profile SET default_currency = ? WHERE id = 1`,
      [c]
    );
    await loadAndSync();
  }, [loadAndSync]);

  const displayAmount = useCallback((fcfa: number) => formatWithCurrency(fcfa), [currency]);

  return (
    <CurrencyContext.Provider value={{
      currency,
      symbol,
      isLocked,
      displayAmount,
      changeCurrency,
      refreshCurrency: loadAndSync,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCurrency() {
  return useContext(CurrencyContext);
}
