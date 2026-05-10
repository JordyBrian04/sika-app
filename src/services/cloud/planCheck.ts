/**
 * Vérification du plan Pro depuis n'importe quelle fonction async
 * (sans hook React — utilisable dans les handlers, services, repos).
 */

import { getOne } from "@/src/db";
import { Alert } from "react-native";
import { router } from "expo-router";

export async function getUserPlan(): Promise<"free" | "pro"> {
  const row = await getOne<{ plan: string | null; plan_expires_at: string | null }>(
    `SELECT plan, plan_expires_at FROM user_profile WHERE id = 1`
  );
  const plan = row?.plan ?? "free";
  if (plan === "pro" && row?.plan_expires_at) {
    return new Date(row.plan_expires_at) > new Date() ? "pro" : "free";
  }
  return plan as "free" | "pro";
}

export async function isUserPro(): Promise<boolean> {
  return (await getUserPlan()) === "pro";
}

/**
 * Affiche une alerte "fonctionnalité Pro" et propose d'ouvrir le Paywall.
 * Retourne true si l'utilisateur est Pro, false sinon.
 */
export async function requirePro(featureName?: string): Promise<boolean> {
  if (await isUserPro()) return true;

  Alert.alert(
    "⭐ Fonctionnalité Pro",
    featureName
      ? `${featureName} est réservé au plan Sika Pro. Passe à Pro pour débloquer cette fonctionnalité.`
      : "Cette fonctionnalité est réservée au plan Sika Pro.",
    [
      { text: "Plus tard", style: "cancel" },
      {
        text: "Voir Sika Pro →",
        onPress: () => router.push("/(screens)/Paywall" as any),
      },
    ]
  );
  return false;
}
