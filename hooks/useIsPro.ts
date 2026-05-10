import { getOne } from "@/src/db";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";

type ProStatus = {
  isPro: boolean;
  plan: "free" | "pro";
  expiresAt: string | null;
  isLoading: boolean;
};

/**
 * Retourne le statut Pro de l'utilisateur basé sur le champ `plan`
 * stocké localement dans user_profile.
 *
 * - isPro = true seulement si plan = 'pro' ET non expiré
 * - Se rafraîchit à chaque fois que l'écran reprend le focus
 *
 * Usage:
 *   const { isPro } = useIsPro();
 *   if (!isPro) return <Paywall />;
 */
export function useIsPro(): ProStatus {
  const [status, setStatus] = useState<ProStatus>({
    isPro: false,
    plan: "free",
    expiresAt: null,
    isLoading: true,
  });

  const check = useCallback(async () => {
    const row = await getOne<{ plan: string | null; plan_expires_at: string | null }>(
      `SELECT plan, plan_expires_at FROM user_profile WHERE id = 1`
    );

    const plan = (row?.plan ?? "free") as "free" | "pro";
    const expiresAt = row?.plan_expires_at ?? null;

    let isPro = plan === "pro";
    if (isPro && expiresAt) {
      isPro = new Date(expiresAt) > new Date();
    }

    setStatus({ isPro, plan, expiresAt, isLoading: false });
  }, []);

  // Vérifie au premier rendu et à chaque retour sur l'écran
  useFocusEffect(
    useCallback(() => {
      check();
    }, [check])
  );

  return status;
}
