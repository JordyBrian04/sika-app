/**
 * Client HTTP pour le backend Sika (sika-app-node).
 * Gère automatiquement le rafraîchissement du token JWT.
 */

import { getOne, runSql } from "@/src/db";

// ─── Config ─────────────────────────────────────────────────────────────────

export const API_BASE = __DEV__
  ? "http://192.168.1.189:3000"
  : "https://api.sika-app.org";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ApiSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix timestamp (seconds)
};

export type CloudUser = {
  id: string;
  phone: string | null;
  name: string;
  email: string | null;
};

export type ApiError = {
  error: string | Record<string, string[]>;
};

// ─── Helpers locaux ──────────────────────────────────────────────────────────

/** Lit la session stockée dans SQLite (user_profile id=1) */
async function getLocalSession(): Promise<ApiSession | null> {
  const row = await getOne<{
    access_token: string | null;
    refresh_token: string | null;
    token_expires_at: number | null;
  }>(`SELECT access_token, refresh_token, token_expires_at FROM user_profile WHERE id = 1`);

  if (!row?.access_token || !row?.refresh_token) return null;
  return {
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expires_at: row.token_expires_at ?? 0,
  };
}

/** Sauvegarde la session dans SQLite */
export async function saveSession(session: ApiSession): Promise<void> {
  await runSql(
    `UPDATE user_profile SET
       access_token = ?,
       refresh_token = ?,
       token_expires_at = ?
     WHERE id = 1`,
    [session.access_token, session.refresh_token, session.expires_at]
  );
}

/** Efface la session (logout) */
export async function clearSession(): Promise<void> {
  await runSql(
    `UPDATE user_profile SET
       access_token = NULL,
       refresh_token = NULL,
       token_expires_at = NULL,
       cloud_user_id = NULL,
       cloud_phone = NULL,
       cloud_email = NULL,
       last_sync_at = NULL
     WHERE id = 1`
  );
}

/** Rafraîchit le token via /auth/refresh */
async function doRefresh(refresh_token: string): Promise<ApiSession | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const session: ApiSession = data.session;
    await saveSession(session);
    return session;
  } catch {
    return null;
  }
}

// ─── Client principal ────────────────────────────────────────────────────────

/**
 * Fetch authentifié. Rafraîchit le token si expiré (ou 401).
 * @param path  ex: "/sync/push"
 * @param options fetch options classiques
 * @param _retry usage interne pour éviter boucle infinie
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
  _retry = true
): Promise<Response> {
  let session = await getLocalSession();

  // Refresh préventif si token expire dans moins de 5 minutes
  if (session && session.expires_at > 0) {
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec >= session.expires_at - 300) {
      const refreshed = await doRefresh(session.refresh_token);
      if (refreshed) session = refreshed;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Token expiré côté serveur → on tente un refresh puis on relance
  if (res.status === 401 && _retry && session?.refresh_token) {
    const refreshed = await doRefresh(session.refresh_token);
    if (refreshed) return apiFetch(path, options, false);
  }

  return res;
}

/** Requête publique (sans token) */
export async function apiPublic(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
  });
}
