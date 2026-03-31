import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import ExpenseCalendar60Days from "@/src/components/ExpenseCalendar60Days";
import { listBadgesWithStatus } from "@/src/db/repositories/badgesRepo";
import {
  backupDatabaseToShare,
  pickAndRestoreDatabase,
  resetAllDatas,
} from "@/src/db/repositories/settingRepo";
import { getProfile, LevelInfo } from "@/src/services/gamification/xpService";
import {
  ExpenseDay,
  getExpenseCalendar60Days,
} from "@/src/services/stats/expenseCalendar";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { useAppTextColor } from "@/src/utils/colos";
import {
  AntDesign,
  Entypo,
  FontAwesome5,
  Foundation,
  MaterialIcons,
} from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import * as Updates from "expo-updates";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
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

  const getUser = async () => {
    const res = await getProfile();
    setUser(res ?? null);

    if (!res) {
      setInitiales("");
      setUserBadges([]);
      return;
    }

    const xpInto = user?.xpIntoLevel ?? 0;
    const xpNext = user?.xpForNextLevel ?? 1; // évite /0
    const xpPct = Math.max(0, Math.min(100, (xpInto / xpNext) * 100));
    setXpPer(xpPct);

    const words = (res.name ?? "").trim().split(/\s+/);
    const initialsString = words
      .slice(0, 2)
      .map((w) => w.charAt(0))
      .join("");
    setInitiales(initialsString);

    const userBagdeRes = await listBadgesWithStatus();
    setUserBadges(userBagdeRes ?? []);
  };

  const onBackup = async () => {
    try {
      setLoading("backup");
      const res = await backupDatabaseToShare();
      Alert.alert("Sauvegarde", "Sauvegarde créée ✅");
      console.log("Backup path:", res.backupPath);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Erreur backup.");
    } finally {
      setLoading(null);
    }
  };

  const onRestore = async () => {
    setLoading("restore");
    const res: any = await pickAndRestoreDatabase();
    setLoading(null);

    if (!res.ok) {
      if ("cancelled" in res && res.cancelled) return;
      Alert.alert("Erreur", res.error);
      return;
    }

    Alert.alert(
      "Restauration OK ✅",
      "La base a été restaurée. L’app va redémarrer pour recharger SQLite.",
      [
        {
          text: "Redémarrer",
          onPress: async () => {
            // reload propre (évite les DB encore ouvertes)
            try {
              await Updates.reloadAsync();
            } catch {
              // fallback: l’utilisateur relance manuellement
            }
          },
        },
      ],
    );
  };

  const deleteAllData = async () => {
    setLoading("delete");
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

        const words = (res.name ?? "").trim().split(/\s+/);
        setInitiales(
          words
            .slice(0, 2)
            .map((w) => w.charAt(0))
            .join(""),
        );

        const badges = await listBadgesWithStatus();
        if (active) setUserBadges(badges ?? []);
      })();

      return () => {
        active = false;
      };
    }, []),
  );

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
        <ThemedText style={{ fontFamily: FONT_FAMILY.bold, fontSize: 25 }}>
          🛠️ Paramètres
        </ThemedText>

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
            onPress={() =>
              Alert.alert(
                "Restauration ou sauvegarde des données",
                "Voulez-vous sauvegarder vos données actuelles ou en restaurer une précédente ?",
                [
                  {
                    text: "Sauvegarder",
                    onPress: () => onBackup(),
                  },
                  {
                    text: "Restaurer",
                    onPress: () => onRestore(),
                  },
                  {
                    text: "Annuler",
                    style: "cancel",
                  },
                ],
              )
            }
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
