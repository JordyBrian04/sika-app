/**
 * Service d'authentification cloud pour Sika App.
 * Inscription et connexion via le backend Node (phone + password, sans OTP).
 */

import { runSql, getOne } from "@/src/db";
import { apiPublic, saveSession, clearSession, CloudUser, ApiSession } from "./api";
import { syncSubscriptionStatus } from "./paymentService";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AuthResult =
  | { ok: true; user: CloudUser; session: ApiSession }
  | { ok: false; error: string };

export type CloudProfile = {
  cloud_user_id: string | null;
  cloud_phone: string | null;
  cloud_email: string | null;
  name: string;
  plan: string;
  plan_expires_at: string | null;
  last_sync_at: string | null;
  access_token: string | null;
};

// ─── Helpers locaux ──────────────────────────────────────────────────────────

/** Persiste les infos cloud dans user_profile + synchronise le plan Pro depuis Supabase */
async function saveCloudProfile(user: CloudUser, session: ApiSession): Promise<void> {
  await saveSession(session);
  await runSql(
    `UPDATE user_profile SET
       cloud_user_id = ?,
       cloud_phone   = ?,
       cloud_email   = ?
     WHERE id = 1`,
    [user.id, user.phone ?? null, user.email ?? null]
  );

  // Synchroniser le statut Pro depuis Supabase (multi-appareils)
  // Si l'utilisateur a payé sur un autre appareil, on récupère son plan ici
  try {
    await syncSubscriptionStatus();
  } catch {
    // Non bloquant — l'app fonctionne en mode gratuit si le serveur est inaccessible
  }
}

function parseError(body: any): string {
  if (typeof body?.error === "string") return body.error;
  if (typeof body?.error === "object") {
    return Object.values(body.error).flat().join(" · ");
  }
  return "Erreur inconnue";
}

/** Parse la réponse JSON de façon sécurisée — renvoie null si le corps n'est pas du JSON valide */
async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    // Le serveur a renvoyé du HTML ou une réponse vide (ex: backend non démarré, proxy 502)
    return { error: `Le serveur est inaccessible ou a renvoyé une erreur inattendue (HTTP ${res.status}). Vérifie que le backend est démarré.` };
  }
}

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Inscription avec numéro de téléphone + mot de passe.
 * Email optionnel (utilisé comme contact/récupération).
 */
export async function registerWithPhone(
  phone: string,
  password: string,
  name: string,
  email?: string
): Promise<AuthResult> {
  try {
    const res = await apiPublic("/auth/register/phone-password", {
      method: "POST",
      body: JSON.stringify({ phone, password, name, email }),
    });

    const body = await safeJson(res);

    if (!res.ok) return { ok: false, error: parseError(body) };
    if (!body.session) return { ok: false, error: body.message ?? "Compte créé, veuillez vous connecter." };

    await saveCloudProfile(body.user, body.session);
    return { ok: true, user: body.user, session: body.session };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Erreur réseau" };
  }
}

/**
 * Connexion avec email + mot de passe.
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const res = await apiPublic("/auth/login/email", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const body = await safeJson(res);

    if (!res.ok) return { ok: false, error: parseError(body) };

    await saveCloudProfile(body.user, body.session);
    return { ok: true, user: body.user, session: body.session };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Erreur réseau" };
  }
}

/**
 * Connexion avec téléphone + mot de passe (sans OTP).
 */
export async function loginWithPhone(
  phone: string,
  password: string
): Promise<AuthResult> {
  try {
    const res = await apiPublic("/auth/login/phone-password", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });

    const body = await safeJson(res);

    if (!res.ok) return { ok: false, error: parseError(body) };

    await saveCloudProfile(body.user, body.session);
    return { ok: true, user: body.user, session: body.session };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Erreur réseau" };
  }
}

/**
 * Déconnexion : efface les tokens locaux.
 * (pas d'invalidation côté serveur — les JWTs expirent naturellement)
 */
export async function logout(): Promise<void> {
  await clearSession();
}

/**
 * Retourne le profil cloud stocké localement.
 * null si l'utilisateur n'est pas connecté au cloud.
 */
export async function getCloudProfile(): Promise<CloudProfile | null> {
  const row = await getOne<CloudProfile>(
    `SELECT cloud_user_id, cloud_phone, cloud_email, name,
            plan, plan_expires_at, last_sync_at, access_token
     FROM user_profile WHERE id = 1`
  );
  if (!row?.cloud_user_id) return null;
  return row;
}

/** Vérifie si l'utilisateur est connecté au cloud */
export async function isCloudAuthenticated(): Promise<boolean> {
  const row = await getOne<{ cloud_user_id: string | null }>(
    `SELECT cloud_user_id FROM user_profile WHERE id = 1`
  );
  return !!row?.cloud_user_id;
}
