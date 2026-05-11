/**
 * Écran Paywall — présentation des offres Sika Pro.
 * Paiement via GeniusPay Wave (ouvert dans le navigateur intégré).
 */

import { COLORS } from "@/components/ui/color";
import { useIsPro } from "@/hooks/useIsPro";
import { getOne } from "@/src/db";
import {
  cancelSubscription,
  computeDisplayFees,
  initiateWavePayment,
  syncSubscriptionStatus,
  verifyPaymentByReference,
} from "@/src/services/cloud/paymentService";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Données ──────────────────────────────────────────────────────────────────

const FREE_FEATURES = [
  "Transactions illimitées",
  "Solde global et historique",
  "17 catégories par défaut",
  "5 budgets par mois",
  "2 objectifs d'épargne",
  "Gamification complète (badges, XP, missions)",
  "Notifications de paiements récurrents",
  "Statistiques de base",
  "Sauvegarde locale manuelle",
  "Export PDF / Excel"
];

const PRO_FEATURES = [
  { label: "Sync cloud & multi-appareils", icon: "cloud" as const },
  { label: "Catégories personnalisées", icon: "tag" as const },
  { label: "Budgets illimités + alertes", icon: "bar-chart-2" as const },
  { label: "Objectifs illimités + règles auto", icon: "target" as const },
  { label: "Rapports avancés & insights IA", icon: "trending-up" as const },
  // { label: "Export PDF / Excel", icon: "download" as const },
  // { label: "Thèmes & personnalisation", icon: "sliders" as const },
  { label: "Changez de devise comme vous voulez", icon: "refresh-ccw" as const },
];

type PlanKey = "monthly" | "yearly" | "lifetime";

const PLANS: { key: PlanKey; label: string; amount: number; price: string; sub: string; badge?: string }[] = [
  {
    key: "monthly",
    label: "Mensuel",
    amount: 1500,
    price: "1 500 FCFA",
    sub: "par mois",
  },
  {
    key: "yearly",
    label: "Annuel",
    amount: 15000,
    price: "15 000 FCFA",
    sub: "par an · ~1 250 FCFA/mois",
    badge: "−17%",
  },
  {
    key: "lifetime",
    label: "À vie",
    amount: 80000,
    price: "80 000 FCFA",
    sub: "paiement unique · early adopter",
    badge: "Meilleur choix",
  },
];

// ─── Composant ────────────────────────────────────────────────────────────────

export default function Paywall() {
  const router = useRouter();
  const { isPro, expiresAt } = useIsPro();
  const [selected, setSelected] = useState<PlanKey>("yearly");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("+225");
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lastReference, setLastReference] = useState<string | null>(null);

  const handlePurchase = async () => {
    if (!showPhoneInput) {
      // Vérifier que l'utilisateur a un compte cloud (token requis par le backend)
      const row = await getOne<{ access_token: string | null; cloud_phone: string | null }>(
        `SELECT access_token, cloud_phone FROM user_profile WHERE id = 1`
      );

      if (!row?.access_token) {
        Alert.alert(
          "Connexion requise",
          "Tu dois connecter ton compte Sika Cloud pour souscrire à Sika Pro.\n\nVa dans Paramètres → Créer un compte ou Se connecter, puis reviens ici.",
          [{ text: "Compris" }]
        );
        return;
      }

      if (row?.cloud_phone) setPhone(row.cloud_phone);
      setShowPhoneInput(true);
      return;
    }

    // Validation du numéro
    if (!/^\+\d{8,15}$/.test(phone.trim())) {
      Alert.alert("Numéro invalide", "Format : +225XXXXXXXXXX");
      return;
    }

    setLoading(true);
    const result = await initiateWavePayment(selected, phone.trim());
    setLoading(false);

    if (!result.ok) {
      Alert.alert("Erreur de paiement", result.error);
      return;
    }

    // Vérification défensive : payment_url doit être une URL valide
    if (!result.payment_url || !result.payment_url.startsWith("http")) {
      Alert.alert(
        "Erreur",
        "L'URL de paiement n'a pas pu être générée. Vérifie ta connexion et réessaie."
      );
      return;
    }

    // Stocker la référence pour la vérification manuelle
    setLastReference(result.reference);

    // Ouvrir Wave dans le navigateur intégré
    try {
      await WebBrowser.openBrowserAsync(result.payment_url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      });
    } catch (e: any) {
      // Fallback : si le navigateur échoue, proposer d'ouvrir dans Safari/Chrome
      Alert.alert(
        "Impossible d'ouvrir le navigateur",
        `Copie ce lien et colle-le dans ton navigateur :\n\n${result.payment_url}`,
        [{ text: "OK" }]
      );
      return;
    }

    // Après fermeture du navigateur → vérifier Supabase d'abord (webhook peut déjà être passé)
    setChecking(true);
    const statusAfter = await syncSubscriptionStatus();
    let isPro = statusAfter.is_pro;

    // Si pas encore Pro → tenter la vérification directe GeniusPay
    if (!isPro && result.reference) {
      const verif = await verifyPaymentByReference(result.reference);
      isPro = verif.is_pro;
    }
    setChecking(false);

    if (isPro) {
      Alert.alert(
        "🎉 Bienvenue dans Sika Pro !",
        "Ton paiement a été confirmé. Toutes les fonctionnalités Pro sont maintenant actives.",
        [{ text: "Commencer", onPress: () => router.back() }]
      );
    } else {
      Alert.alert(
        "En attente de confirmation",
        "Ton paiement est en cours de traitement. Si tu as déjà payé, attends quelques secondes et reviens dans cet écran.",
        [
          { text: "Vérifier maintenant", onPress: handleCheckStatus },
          { text: "OK", style: "cancel" },
        ]
      );
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);

    // 1. Vérifier d'abord Supabase — le webhook a peut-être déjà activé le plan
    const status = await syncSubscriptionStatus();
    let isPro = status.is_pro;

    // 2. Si pas encore Pro ET qu'on a une référence → interroger GeniusPay directement
    if (!isPro && lastReference) {
      const verif = await verifyPaymentByReference(lastReference);
      isPro = verif.is_pro;
    }

    setChecking(false);

    if (isPro) {
      Alert.alert(
        "✅ Sika Pro actif !",
        "Ton abonnement est confirmé.",
        [{ text: "Super !", onPress: () => router.back() }]
      );
    } else {
      Alert.alert(
        "Pas encore confirmé",
        "Le paiement n'est pas encore arrivé. Réessaie dans quelques secondes."
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={22} color={COLORS.dark} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.crownWrap}>
            <Text style={styles.crownEmoji}>⭐</Text>
          </View>
          <Text style={styles.heroTitle}>Sika Pro</Text>
          <Text style={styles.heroSub}>
            Prends le contrôle total de tes finances
          </Text>
        </View>

        {/* Statut actuel */}
        {isPro && (
          <View>
            <View style={styles.alreadyPro}>
              <Feather name="check-circle" size={18} color="#16A34A" />
              <Text style={styles.alreadyProText}>
                Tu es déjà Pro
                {expiresAt
                  ? ` · expire le ${new Date(expiresAt).toLocaleDateString("fr-FR")}`
                  : " (à vie)"}
              </Text>
            </View>
            {/* Annulation — uniquement pour les abonnements avec date d'expiration */}
            {expiresAt && (
              <TouchableOpacity
                style={{ alignSelf: "center", marginTop: 8, marginBottom: 4 }}
                onPress={() => {
                  Alert.alert(
                    "Annuler l'abonnement",
                    `Ton accès Pro restera actif jusqu'au ${new Date(expiresAt).toLocaleDateString("fr-FR")}. Après cette date, tu reviendras au plan Gratuit.\n\nConfirmer ?`,
                    [
                      { text: "Non", style: "cancel" },
                      {
                        text: "Oui, annuler",
                        style: "destructive",
                        onPress: async () => {
                          const result = await cancelSubscription();
                          Alert.alert(
                            result.ok ? "Annulation confirmée" : "Erreur",
                            result.message
                          );
                          if (result.ok) await syncSubscriptionStatus();
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: "#666" }}>
                  Annuler l'abonnement
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Features Pro */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tout ce que tu débloques</Text>
          {PRO_FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Feather name={f.icon} size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        {!isPro && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Choisis ton offre</Text>
              {PLANS.map((plan) => (
                <TouchableOpacity
                  key={plan.key}
                  style={[
                    styles.planCard,
                    selected === plan.key && styles.planCardSelected,
                  ]}
                  onPress={() => setSelected(plan.key)}
                  activeOpacity={0.8}
                >
                  {plan.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{plan.badge}</Text>
                    </View>
                  )}
                  <View style={styles.planRadio}>
                    <View
                      style={[
                        styles.radioOuter,
                        selected === plan.key && styles.radioOuterSelected,
                      ]}
                    >
                      {selected === plan.key && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planLabel}>{plan.label}</Text>
                    <Text style={styles.planSub}>{plan.sub}</Text>
                  </View>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Champ téléphone + récap facture (s'affiche après le 1er tap) */}
            {showPhoneInput && (() => {
              const plan = PLANS.find(p => p.key === selected)!;
              const { fees, total } = computeDisplayFees(plan.amount);
              return (
                <>
                  <View style={styles.phoneWrap}>
                    <Text style={styles.phoneLabel}>Numéro Wave pour le paiement</Text>
                    <TextInput
                      style={styles.phoneInput}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="+225 07 XX XX XX XX"
                      placeholderTextColor="#aaa"
                      keyboardType="phone-pad"
                      autoFocus
                    />
                  </View>

                  {/* Récapitulatif de la facture */}
                  <View style={styles.invoice}>
                    <Text style={styles.invoiceTitle}>Détail de la facture</Text>
                    <View style={styles.invoiceRow}>
                      <Text style={styles.invoiceLabel}>{plan.label}</Text>
                      <Text style={styles.invoiceValue}>{plan.amount.toLocaleString("fr-FR")} FCFA</Text>
                    </View>
                    <View style={styles.invoiceRow}>
                      <Text style={styles.invoiceLabel}>Frais de service</Text>
                      <Text style={styles.invoiceValue}>{fees.toLocaleString("fr-FR")} FCFA</Text>
                    </View>
                    <View style={[styles.invoiceRow, styles.invoiceTotal]}>
                      <Text style={styles.invoiceTotalLabel}>Total à payer</Text>
                      <Text style={styles.invoiceTotalValue}>{total.toLocaleString("fr-FR")} FCFA</Text>
                    </View>
                    <Text style={styles.invoiceNote}>
                      1% de commission + 100 FCFA fixe + 150 FCFA opérateur Wave
                    </Text>
                  </View>
                </>
              );
            })()}

            {/* Bouton de vérification si paiement en attente */}
            {checking && (
              <View style={styles.checkingRow}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.checkingText}>Vérification du paiement…</Text>
              </View>
            )}

            {/* CTA principal */}
            <TouchableOpacity
              style={[styles.ctaBtn, (loading || checking) && { opacity: 0.7 }]}
              onPress={handlePurchase}
              disabled={loading || checking}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaText}>
                  {showPhoneInput ? "💳 Payer via Wave" : "Passer à Sika Pro →"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Lien vérification manuelle */}
            {showPhoneInput && (
              <TouchableOpacity onPress={handleCheckStatus} disabled={checking}>
                <Text style={styles.checkLink}>J'ai déjà payé → Vérifier le statut</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.legal}>
              Paiement sécurisé via Wave · GeniusPay.{"\n"}
              Aucun frais caché · Annulable à tout moment (mensuel/annuel).
            </Text>
          </>
        )}

        {/* Plan gratuit — récap */}
        <View style={[styles.section, { marginTop: 8 }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.gray }]}>
            Inclus dans le plan gratuit
          </Text>
          {FREE_FEATURES.map((f) => (
            <View key={f} style={styles.freeRow}>
              <Feather name="check" size={14} color={COLORS.gray} />
              <Text style={styles.freeLabel}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backBtn: { padding: 8 },
  scroll: { padding: 20, paddingTop: 8 },

  // Hero
  hero: { alignItems: "center", marginBottom: 28, marginTop: 8 },
  crownWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEF08A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  crownEmoji: { fontSize: 34 },
  heroTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 26,
    color: COLORS.dark,
    marginBottom: 6,
  },
  heroSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },

  // Already pro
  alreadyPro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  alreadyProText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 14,
    color: "#16A34A",
  },

  // Section
  section: {
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 4,
  },

  // Pro features
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 14,
    color: COLORS.dark,
  },

  // Plans
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    position: "relative",
    backgroundColor: "#fff",
  },
  planCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "08",
  },
  badge: {
    position: "absolute",
    top: -10,
    right: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 11,
    color: "#fff",
  },
  planRadio: { justifyContent: "center" },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CCC",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: { borderColor: COLORS.primary },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  planLabel: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 15,
    color: COLORS.dark,
  },
  planSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  planPrice: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: COLORS.dark,
  },

  // CTA
  ctaBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  ctaText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 16,
    color: "#fff",
  },
  legal: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 8,
  },

  // Free features
  freeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  freeLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: COLORS.gray,
  },

  // Téléphone Wave
  phoneWrap: { marginBottom: 4 },
  phoneLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    color: COLORS.dark,
    marginBottom: 6,
  },
  phoneInput: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 15,
    color: COLORS.dark,
    backgroundColor: "#FAFAFA",
  },

  // Vérification en cours
  checkingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 4,
  },
  checkingText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: COLORS.gray,
  },

  // Lien vérif manuelle
  checkLink: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    color: COLORS.primary,
    textAlign: "center",
    paddingVertical: 6,
  },

  // Facture
  invoice: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 4,
  },
  invoiceTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 13,
    color: COLORS.dark,
    marginBottom: 4,
  },
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  invoiceLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: "#555",
  },
  invoiceValue: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    color: COLORS.dark,
  },
  invoiceTotal: {
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingTop: 8,
    marginTop: 4,
  },
  invoiceTotalLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: COLORS.dark,
  },
  invoiceTotalValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: COLORS.primary,
  },
  invoiceNote: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
});
