import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import { useIsPro } from "@/hooks/useIsPro";
import ExpenseCalendar60Days from "@/src/components/ExpenseCalendar60Days";
import { useCurrency } from "@/src/context/CurrencyContext";
import { listBadgesWithStatus } from "@/src/db/repositories/badgesRepo";
import {
  backupDatabaseToShare,
  pickAndRestoreDatabase,
  resetAllDatas
} from "@/src/db/repositories/settingRepo";
import {
  CloudProfile,
  getCloudProfile,
  logout,
} from "@/src/services/cloud/authService";
import { cancelSubscription, syncSubscriptionStatus } from "@/src/services/cloud/paymentService";
import { requirePro } from "@/src/services/cloud/planCheck";
import { fullSync, SyncResult } from "@/src/services/cloud/syncService";
import { SETUP_CURRENCIES } from "@/src/services/currency/currencyService";
import { getProfile, LevelInfo } from "@/src/services/gamification/xpService";
import { generateMonthlyPDF, generateShareCard } from "@/src/services/reports/reportService";
import {
  ExpenseDay,
  getExpenseCalendar60Days,
} from "@/src/services/stats/expenseCalendar";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { useAppTextColor } from "@/src/utils/colos";
import {
  AntDesign,
  Entypo,
  Feather,
  FontAwesome5,
  Foundation,
  MaterialIcons,
} from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import * as Updates from "expo-updates";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TabFiveScreen() {
  const color = useAppTextColor();
  const [user, setUser] = useState<LevelInfo | null>(null);
  const [initial, setInitiales] = useState<any>("");
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<ExpenseDay[]>([]);
  const [loading, setLoading] = useState<
    "backup" | "restore" | "delete" | null
  >(null);
  const [xpPer, setXpPer] = useState(0);

  // Cloud sync state
  const [cloudProfile, setCloudProfile] = useState<CloudProfile | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Plan Pro
  const { isPro, expiresAt } = useIsPro();

  // Devise globale
  const { currency: globalCurrency, isLocked, changeCurrency } = useCurrency();

  const onBackup = async () => {
    // setLoading("backup");
    try {
      await backupDatabaseToShare();
      Alert.alert("Sauvegarde", "Sauvegarde créée ✅");
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Erreur backup.");
    } finally {
      setLoading(null);
    }
  };

  const onRestore = async () => {
    // setLoading("restore");
    const res: any = await pickAndRestoreDatabase();
    setLoading(null);

    if (!res.ok) {
      if ("cancelled" in res && res.cancelled) return;
      Alert.alert("Erreur", res.error);
      return;
    }

    // Updates.reloadAsync() ne fonctionne pas dans Expo Go.
    // On tente le reload ; si ça échoue on demande à l’utilisateur de le faire manuellement.
    try {
      await Updates.reloadAsync();
    } catch {
      Alert.alert(
        "Restauration OK ✅",
        "La base a été restaurée.\n\nFerme complètement l’app et rouvre-la pour recharger tes données.",
        [{ text: "OK, je redémarre" }],
      );
    }
  };

  const deleteAllData = async () => {
    // setLoading("delete");
    try {
      await resetAllDatas();
      Alert.alert("Données supprimées", "Toutes les données ont été effacées.");
      await Updates.reloadAsync();
      router.push("/");
    } catch (error) {
      console.error("Erreur lors de la réinitialisation des données:", error);
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => {
    (async () => {
      const data = await getExpenseCalendar60Days();
      setCalendar(data);
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      (async () => {
        const res = await getProfile();
        if (!active) return;

        setUser(res ?? null);

        if (!res) {
          setInitiales("");
          setUserBadges([]);
          return;
        }

        const xpInto = res.xpIntoLevel ?? 0;
        const xpNext = res.xpForNextLevel ?? 1;
        setXpPer(Math.max(0, Math.min(100, (xpInto / xpNext) * 100)));

        const words = (res.name ?? "").trim().split(/\s+/);
        setInitiales(
          words
            .slice(0, 2)
            .map((w) => w.charAt(0))
            .join(""),
        );

        const badges = await listBadgesWithStatus();
        if (active) setUserBadges(badges ?? []);

        // Charger le profil cloud
        const cloud = await getCloudProfile();
        if (active) setCloudProfile(cloud);
      })();

      return () => {
        active = false;
      };
    }, []),
  );

  const handleSync = async () => {
    if (!(await requirePro("La synchronisation cloud"))) return;
    setSyncing(true);
    const result: SyncResult = await fullSync();
    setSyncing(false);
    if (result.ok) {
      Alert.alert(
        "Sync réussie ✅",
        `${result.pushed} envoyés · ${result.pulled} reçus`,
      );
      // Rafraîchir le profil cloud pour la date de dernier sync
      const cloud = await getCloudProfile();
      setCloudProfile(cloud);
    } else {
      Alert.alert("Erreur de sync", result.error ?? "Réessaie plus tard.");
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Se déconnecter",
      "Tes données locales restent intactes. Tu pourras te reconnecter depuis cet écran.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Déconnecter",
          style: "destructive",
          onPress: async () => {
            await logout();
            setCloudProfile(null);
          },
        },
      ],
    );
  };

  function loadingModal() {
    if (!loading) return null;

    return (
      <Modal transparent={true} visible={!!loading}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 18 }}>
              {loading === "backup"
                ? "Sauvegarde en cours..."
                : loading === "restore"
                  ? "Restauration en cours..."
                  : "Suppression en cours..."}
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 10, gap: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      // refreshControl={
      //   <RefreshControl onRefresh={fetchDatas} refreshing={loading} />
      // }
      >
        <Text
          style={{
            fontFamily: FONT_FAMILY.bold,
            fontSize: 30,
            color: color,
            flexWrap: "wrap",
          }}
        >
          🛠️ Paramètres
        </Text>

        <ThemedView
          style={{
            backgroundColor:
              color === "#FFFFFF" ? COLORS.dark : COLORS.secondary,
            padding: 12,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <View
              style={{
                backgroundColor: COLORS.primary,
                width: 90,
                height: 90,
                borderRadius: 100,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: FONT_FAMILY.bold,
                  fontSize: 30,
                  color: COLORS.white,
                }}
              >
                {initial}
              </Text>

              <View
                style={{
                  padding: 7,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#16A34A",
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: COLORS.white,
                  position: "absolute",
                  bottom: -12,
                  marginBottom: 7,
                }}
              >
                <Text
                  style={{
                    fontFamily: FONT_FAMILY.medium,
                    color: COLORS.white,
                    fontSize: 12,
                  }}
                >
                  Niveau {user?.level}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flex: 1, gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <ThemedText
                style={{ fontFamily: FONT_FAMILY.bold, fontSize: 18 }}
              >
                {user?.name}
              </ThemedText>
              <Text
                style={{ fontFamily: FONT_FAMILY.medium, color: COLORS.gray }}
              >
                XP : {user?.xpIntoLevel} / {user?.xpForNextLevel}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: COLORS.gray + "30",
                height: 10,
                borderRadius: 5,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  backgroundColor: COLORS.green,
                  height: "100%",
                  width: `${xpPer}%`,
                  borderRadius: 5,
                }}
              />
            </View>
          </View>
        </ThemedView>

        <View
          style={{
            backgroundColor: COLORS.gray + "30",
            padding: 12,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-around",
          }}
        >
          <View
            style={{ gap: 5, alignItems: "center", justifyContent: "center" }}
          >
            <View
              style={{
                backgroundColor: COLORS.gray + "35",
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FontAwesome5 name="fire" size={24} color={COLORS.red} />
            </View>
            <ThemedText style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16 }}>
              {(Number(user?.streak_days) || 0) < 10
                ? String(Number(user?.streak_days) || 0).padStart(2, "0")
                : Number(user?.streak_days) || 0}
            </ThemedText>
            <ThemedText
              style={{ fontFamily: FONT_FAMILY.medium, color: COLORS.gray }}
            >
              série de jours
            </ThemedText>
          </View>

          <View
            style={{ gap: 5, alignItems: "center", justifyContent: "center" }}
          >
            <View
              style={{
                backgroundColor: COLORS.gray + "35",
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AntDesign name="calendar" size={24} color={COLORS.primary} />
            </View>
            <ThemedText style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16 }}>
              {(Number(user?.active_days) || 0) < 10
                ? String(Number(user?.active_days) || 0).padStart(2, "0")
                : Number(user?.active_days) || 0}
            </ThemedText>
            <ThemedText
              style={{ fontFamily: FONT_FAMILY.medium, color: COLORS.gray }}
            >
              jours d'activité
            </ThemedText>
          </View>

          <View
            style={{ gap: 5, alignItems: "center", justifyContent: "center" }}
          >
            <View
              style={{
                backgroundColor: COLORS.gray + "35",
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FontAwesome5 name="trophy" size={24} color={COLORS.green} />
            </View>
            <ThemedText style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16 }}>
              {userBadges.filter((b) => b.earned_at !== null).length}
            </ThemedText>
            <ThemedText
              style={{ fontFamily: FONT_FAMILY.medium, color: COLORS.gray }}
            >
              badges
            </ThemedText>
          </View>
        </View>

        <View
          style={{
            backgroundColor: COLORS.gray + "30",
            padding: 12,
            borderRadius: 16,
            gap: 20,
          }}
        >
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            onPress={() => router.push("/(screens)/Profile" as any)}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <AntDesign
                name="user"
                size={28}
                color={color === "#FFFFFF" ? COLORS.white : COLORS.dark}
              />
              <ThemedText
                style={{ fontFamily: FONT_FAMILY.medium, fontSize: 16 }}
              >
                Mon profil
              </ThemedText>
            </View>
            <Entypo name="chevron-small-right" size={24} color={COLORS.gray} />
          </TouchableOpacity>

          <View
            style={{
              height: 1,
              backgroundColor: COLORS.gray + "30",
              // marginVertical: 10,
            }}
          />

          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            onPress={() => router.push("/(screens)/Categories")}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <MaterialIcons
                name="category"
                size={28}
                color={color === "#FFFFFF" ? COLORS.white : COLORS.dark}
              />
              <ThemedText
                style={{ fontFamily: FONT_FAMILY.medium, fontSize: 16 }}
              >
                Liste des catégories
              </ThemedText>
            </View>
            <Entypo name="chevron-small-right" size={24} color={COLORS.gray} />
          </TouchableOpacity>

          <View
            style={{
              height: 1,
              backgroundColor: COLORS.gray + "30",
              // marginVertical: 10,
            }}
          />

          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            onPress={() => {
              const now = new Date();
              Alert.alert(
                "Données & Rapports",
                "Que voulez-vous faire ?",
                [
                  { text: "Sauvegarder", onPress: () => onBackup() },
                  { text: "Restaurer", onPress: () => onRestore() },
                  {
                    text: "📊 Rapport PDF (Pro)",
                    onPress: async () => {
                      if (!(await requirePro("Le rapport mensuel PDF"))) return;
                      try {
                        await generateMonthlyPDF(now.getMonth() + 1, now.getFullYear());
                      } catch (e: any) { Alert.alert("Erreur", e?.message); }
                    },
                  },
                  {
                    text: "🎴 Partager mon mois",
                    onPress: async () => {
                      try {
                        await generateShareCard(now.getMonth() + 1, now.getFullYear());
                      } catch (e: any) { Alert.alert("Erreur", e?.message); }
                    },
                  },
                  { text: "Annuler", style: "cancel" },
                ],
              );
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Foundation
                name="database"
                size={28}
                color={color === "#FFFFFF" ? COLORS.white : COLORS.dark}
              />
              <ThemedText
                style={{
                  fontFamily: FONT_FAMILY.medium,
                  fontSize: 16,
                  flexWrap: "wrap",
                  // flex: 1,
                  width: "80%",
                }}
              >
                Sauvegarde et restauration des données
              </ThemedText>
            </View>
            <Entypo name="chevron-small-right" size={24} color={COLORS.gray} />
          </TouchableOpacity>

          <View
            style={{
              height: 1,
              backgroundColor: COLORS.gray + "30",
              // marginVertical: 10,
            }}
          />

          {/* <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            onPress={() => router.push("/(screens)/Categories")}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <MaterialCommunityIcons
                name="bank-check"
                size={24}
                color={color === "#FFFFFF" ? COLORS.white : COLORS.dark}
              />
              <ThemedText
                style={{ fontFamily: FONT_FAMILY.medium, fontSize: 16 }}
              >
                Clôture du mois
              </ThemedText>
            </View>
            <Entypo name="chevron-small-right" size={24} color={COLORS.gray} />
          </TouchableOpacity> */}

          {/* <View
            style={{
              height: 1,
              backgroundColor: COLORS.gray + "30",
              // marginVertical: 10,
            }}
          /> */}

          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            onPress={() =>
              Alert.alert(
                "Confirmation",
                "Voulez-vous vraiment supprimer toutes les données ?",
                [
                  { text: "Annuler", style: "cancel" },
                  {
                    text: "Supprimer",
                    onPress: deleteAllData,
                    style: "destructive",
                  },
                ],
              )
            }
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <FontAwesome5 name="eraser" size={24} color={COLORS.red} />
              <ThemedText
                style={{
                  fontFamily: FONT_FAMILY.medium,
                  fontSize: 16,
                  flexWrap: "wrap",
                  // flex: 1,
                  width: "80%",
                  color: COLORS.red,
                }}
              >
                Effacer toutes les données
              </ThemedText>
            </View>
            <Entypo name="chevron-small-right" size={24} color={COLORS.gray} />
          </TouchableOpacity>
        </View>

        {/* ── Devise globale ── */}
        <View style={{ backgroundColor: COLORS.gray + "30", padding: 14, borderRadius: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <ThemedText style={{ fontFamily: FONT_FAMILY.bold, fontSize: 15 }}>
              💱 Devise d'affichage
            </ThemedText>
            {!isPro && isLocked && (
              <View style={{ backgroundColor: "#265ed720", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
                <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 11, color: "#265ed7" }}>⭐ Pro pour changer</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SETUP_CURRENCIES.map((c) => {
              const isActive = globalCurrency === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  onPress={async () => {
                    if (isActive) return;
                    if (!isPro && isLocked) {
                      // Gratuit verrouillé → proposer Pro
                      Alert.alert(
                        "⭐ Fonctionnalité Pro",
                        "Tu as déjà utilisé ton changement de devise gratuit.\n\nPasse à Sika Pro pour changer de devise librement.",
                        [
                          { text: "Non merci", style: "cancel" },
                          { text: "Voir Sika Pro →", onPress: () => router.push("/(screens)/Paywall" as any) },
                        ]
                      );
                      return;
                    }
                    if (!isPro && !isLocked) {
                      // Gratuit, premier changement → avertissement définitif
                      Alert.alert(
                        "⚠️ Attention",
                        `Si tu passes en ${c.label}, tu ne pourras plus revenir à ta devise actuelle sans un abonnement Pro.\n\nConfirmer ?`,
                        [
                          { text: "Annuler", style: "cancel" },
                          {
                            text: `Choisir ${c.label}`,
                            onPress: async () => {
                              await changeCurrency(c.key);
                              // Verrouiller le changement pour les gratuits
                              const { runSql: sql } = await import("@/src/db");
                              await sql(`UPDATE user_profile SET currency_locked = 1 WHERE id = 1`);
                            },
                          },
                        ]
                      );
                      return;
                    }
                    // Pro → changement libre
                    await changeCurrency(c.key);
                  }}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 6,
                    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22,
                    borderWidth: 1.5,
                    borderColor: isActive ? "#265ed7" : COLORS.gray + "50",
                    backgroundColor: isActive ? "#265ed715" : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{c.flag}</Text>
                  <Text style={{
                    fontFamily: FONT_FAMILY.semibold, fontSize: 13,
                    color: isActive ? "#265ed7" : color,
                  }}>{c.label}</Text>
                  {isActive && <Text style={{ fontSize: 10, color: "#265ed7" }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
          {!isPro && (
            <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 11, color: COLORS.gray }}>
              {isLocked
                ? "Abonnement Pro requis pour changer de devise."
                : "Gratuit : 1 changement disponible. Pro : illimité."}
            </Text>
          )}
        </View>

        {/* ── Sika Pro ── */}
        <TouchableOpacity
          onPress={() => router.push("/(screens)/Paywall" as any)}
          activeOpacity={0.85}
          style={{
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              padding: 16,
              borderRadius: 16,
              backgroundColor: isPro ? "#FEF08A" : COLORS.primary,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
            }}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: isPro ? "#854D0E20" : "rgba(255,255,255,0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 22 }}>⭐</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: FONT_FAMILY.bold,
                  fontSize: 16,
                  color: isPro ? "#854D0E" : "#fff",
                }}
              >
                {isPro ? "Sika Pro actif" : "Passer à Sika Pro"}
              </Text>
              <Text
                style={{
                  fontFamily: FONT_FAMILY.regular,
                  fontSize: 12,
                  color: isPro ? "#92400E" : "rgba(255,255,255,0.8)",
                  marginTop: 2,
                }}
              >
                {isPro
                  ? expiresAt
                    ? `Expire le ${new Date(expiresAt).toLocaleDateString("fr-FR")}`
                    : "Abonnement actif"
                  : "Catégories perso · budgets illimités · export PDF"}
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={isPro ? "#854D0E" : "rgba(255,255,255,0.7)"}
            />
          </View>
        </TouchableOpacity>

        {/* Bouton annulation — visible seulement si Pro avec date d'expiration */}
        {isPro && expiresAt && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 8,
              paddingHorizontal: 4,
            }}
            onPress={() => {
              Alert.alert(
                "Annuler l'abonnement",
                `Ton accès Pro restera actif jusqu'au ${new Date(expiresAt).toLocaleDateString("fr-FR")}. Après cette date, tu reviendras au plan Gratuit.\n\nConfirmer l'annulation ?`,
                [
                  { text: "Non, garder Pro", style: "cancel" },
                  {
                    text: "Oui, annuler",
                    style: "destructive",
                    onPress: async () => {
                      const result = await cancelSubscription();
                      if (result.ok) {
                        Alert.alert("Annulation confirmée", result.message);
                        // Rafraîchir le statut local
                        await syncSubscriptionStatus();
                      } else {
                        Alert.alert("Erreur", result.message);
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Feather name="x-circle" size={14} color={COLORS.gray} />
            <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: COLORS.gray }}>
              Annuler l'abonnement
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Sync cloud ── */}
        <View
          style={{
            backgroundColor: COLORS.gray + "30",
            padding: 14,
            borderRadius: 16,
            gap: 14,
          }}
        >
          <ThemedText style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16 }}>
            ☁️ Sync cloud
          </ThemedText>

          {cloudProfile ? (
            /* Connecté */
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: COLORS.primary + "20",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="user" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 14 }}>
                    {cloudProfile.cloud_phone ?? cloudProfile.cloud_email ?? "Compte cloud"}
                  </ThemedText>
                  {cloudProfile.last_sync_at ? (
                    <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: COLORS.gray }}>
                      Dernier sync : {new Date(cloudProfile.last_sync_at).toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </Text>
                  ) : (
                    <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: COLORS.gray }}>
                      Jamais synchronisé
                    </Text>
                  )}
                </View>
              </View>

              {/* Plan badge */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 20,
                    backgroundColor: cloudProfile.plan === "pro" ? "#FEF08A" : COLORS.gray + "30",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: FONT_FAMILY.semibold,
                      fontSize: 12,
                      color: cloudProfile.plan === "pro" ? "#854D0E" : COLORS.gray,
                    }}
                  >
                    {cloudProfile.plan === "pro" ? "⭐ Sika Pro" : "Plan Gratuit"}
                  </Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: COLORS.gray + "30" }} />

              {/* Bouton sync */}
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                onPress={handleSync}
                disabled={syncing}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  {syncing ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Feather name="refresh-cw" size={20} color={COLORS.primary} />
                  )}
                  <ThemedText style={{ fontFamily: FONT_FAMILY.medium, fontSize: 15, color: COLORS.primary }}>
                    {syncing ? "Synchronisation..." : "Synchroniser maintenant"}
                  </ThemedText>
                </View>
              </TouchableOpacity>

              <View style={{ height: 1, backgroundColor: COLORS.gray + "30" }} />

              {/* Déconnexion */}
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
                onPress={handleLogout}
              >
                <Feather name="log-out" size={20} color={COLORS.red} />
                <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 15, color: COLORS.red }}>
                  Se déconnecter
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Non connecté */
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: COLORS.primary + "12",
                padding: 14,
                borderRadius: 12,
              }}
              onPress={() => router.push("/(screens)/CloudSignup" as any)}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Feather name="cloud-off" size={22} color={COLORS.primary} />
                <View>
                  <Text style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 14, color: COLORS.primary }}>
                    Activer la sync cloud
                  </Text>
                  <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: COLORS.gray }}>
                    Sauvegarde automatique de tes données
                  </Text>
                </View>
              </View>
              <Entypo name="chevron-small-right" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Badges */}
        <View
          style={{
            backgroundColor: COLORS.gray + "30",
            padding: 12,
            borderRadius: 16,
            gap: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <ThemedText style={{ fontFamily: FONT_FAMILY.bold, fontSize: 18 }}>
              Mes badges
            </ThemedText>
            <ThemedText
              style={{
                fontFamily: FONT_FAMILY.medium,
                color: COLORS.gray,
                fontSize: 14,
              }}
            >
              {userBadges.filter((b) => b.earned_at !== null).length} obtenus /{" "}
              {userBadges.length}
            </ThemedText>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: COLORS.gray + "30",
              // marginVertical: 10,
            }}
          />

          <View>
            <FlatList
              data={userBadges}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 18,
                  }}
                >
                  <FontAwesome5
                    name="trophy"
                    size={24}
                    color={item.earned_at ? COLORS.green : COLORS.gray}
                  />
                  <ThemedText
                    style={{
                      fontFamily: FONT_FAMILY.medium,
                      fontSize: 12,
                      width: 100,
                      textAlign: "center",
                    }}
                    numberOfLines={3}
                  >
                    {item.title}
                  </ThemedText>
                </View>
              )}
              numColumns={3}
              scrollEnabled={false}
              contentContainerStyle={{
                gap: 25,
                alignItems: "center",
                justifyContent: "center",
                margin: 5,
                position: "relative",
                flex: 1,
              }}
            />
          </View>
        </View>

        {/* Calendrier de dépense */}
        {calendar.length === 60 && <ExpenseCalendar60Days data={calendar} />}
      </ScrollView>
      {loadingModal()}
    </SafeAreaView>
  );
}


