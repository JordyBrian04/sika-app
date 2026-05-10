/**
 * Service de paiement GeniusPay via le backend Sika.
 * Initie un paiement Wave et vérifie le statut après retour.
 */

import { runSql } from "@/src/db";
import { apiFetch } from "./api";

export type PlanKey = "monthly" | "yearly" | "lifetime";

export type InitiateResult =
  | { ok: true; payment_url: string; reference: string; plan_amount: number; fees: number; total: number; plan: PlanKey }
  | { ok: false; error: string };

/**
 * Annule l'abonnement actif (mensuel ou annuel).
 * L'accès Pro reste actif jusqu'à la date d'expiration.
 * L'abonnement à vie ne peut pas être annulé.
 */
export async function cancelSubscription(): Promise<{
  ok: boolean;
  message: string;
  expires_at?: string;
}> {
  try {
    const res = await apiFetch("/subscription/cancel", { method: "POST" });
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

    if (!res.ok) {
      return { ok: false, message: body?.error ?? "Erreur lors de l'annulation" };
    }

    return { ok: true, message: body.message, expires_at: body.expires_at };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Erreur réseau" };
  }
}

/** Calcule les frais affichables côté client (même formule que le backend) */
export function computeDisplayFees(planAmount: number): { fees: number; total: number } {
  const fees = Math.ceil(planAmount * 0.01) + 250;
  return { fees, total: planAmount + fees };
}

export type SubscriptionStatus = {
  plan: "free" | "pro";
  is_pro: boolean;
  expires_at: string | null;
};

/** Lance un paiement Wave via le backend */
export async function initiateWavePayment(
  plan: PlanKey,
  phone: string
): Promise<InitiateResult> {
  try {
    const res = await apiFetch("/subscription/initiate", {
      method: "POST",
      body: JSON.stringify({ plan, phone }),
    });

    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

    if (!res.ok) {
      return { ok: false, error: body?.error ?? "Erreur serveur" };
    }

    return {
      ok: true,
      payment_url: body.payment_url,
      reference:   body.reference,
      plan_amount: body.plan_amount,
      fees:        body.fees,
      total:       body.total,
      plan:        body.plan,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Erreur réseau" };
  }
}

/** Vérifie le statut d'abonnement sur le serveur et met à jour SQLite local */
export async function syncSubscriptionStatus(): Promise<SubscriptionStatus> {
  try {
    const res = await apiFetch("/subscription/status");
    const body = await res.json().catch(() => null);

    if (!res.ok || !body) {
      return { plan: "free", is_pro: false, expires_at: null };
    }

    const status: SubscriptionStatus = {
      plan:       body.plan ?? "free",
      is_pro:     body.is_pro ?? false,
      expires_at: body.expires_at ?? null,
    };

    // Mettre à jour le plan localement dans SQLite
    await runSql(
      `UPDATE user_profile SET
         plan = ?,
         plan_expires_at = ?
       WHERE id = 1`,
      [status.plan, status.expires_at]
    );

    return status;
  } catch {
    return { plan: "free", is_pro: false, expires_at: null };
  }
}

/**
 * Vérifie une transaction GeniusPay par référence et active le plan si completed.
 * Contourne le webhook pour les environnements locaux (dev, Expo Go).
 */
export async function verifyPaymentByReference(
  reference: string
): Promise<{ ok: boolean; is_pro: boolean; message: string }> {
  try {
    const res = await apiFetch("/subscription/verify", {
      method: "POST",
      body: JSON.stringify({ reference }),
    });
    const body = await res.json().catch(() => null);

    if (!res.ok || !body) {
      return { ok: false, is_pro: false, message: body?.error ?? "Erreur serveur" };
    }

    if (body.ok) {
      await runSql(
        `UPDATE user_profile SET plan = 'pro', plan_expires_at = ? WHERE id = 1`,
        [body.expires_at ?? null]
      );
      return { ok: true, is_pro: true, message: body.message ?? "Plan Pro activé" };
    }

    return { ok: false, is_pro: false, message: body.message ?? "Paiement non confirmé" };
  } catch (e: any) {
    return { ok: false, is_pro: false, message: e?.message ?? "Erreur réseau" };
  }
}
