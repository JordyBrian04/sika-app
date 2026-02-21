import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import ExpenseCalendar60Days from "@/src/components/ExpenseCalendar60Days";
import { listBadgesWithStatus } from "@/src/db/repositories/badgesRepo";
import { getProfile, LevelInfo } from "@/src/services/gamification/xpService";
import {
  ExpenseDay,
  getExpenseCalendar60Days,
} from "@/src/services/stats/expenseCalendar";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { color } from "@/src/utils/colos";
import {
  AntDesign,
  Entypo,
  FontAwesome5,
  MaterialIcons,
} from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TabFiveScreen() {
  const [user, setUser] = useState<LevelInfo | null>(null);
  const [initial, setInitiales] = useState<any>("");
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<ExpenseDay[]>([]);

  const getUser = async () => {
    const res = await getProfile();
    console.log(res);
    setUser(res ?? null);
    const words = res.name?.split(" ");
    const initials = words?.slice(0, 2).map((word: any) => word.charAt(0));
    const initialsString = initials?.join("");
    // console.log(initialsString);
    setInitiales(initialsString);

    const userBagdeRes = await listBadgesWithStatus();
    console.log(userBagdeRes);
    setUserBadges(userBagdeRes ?? []);
  };

  useEffect(() => {
    (async () => {
      const data = await getExpenseCalendar60Days();
      setCalendar(data);
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      getUser();
    }, []),
  );
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
                  width: `${(user?.xpIntoLevel! / user?.xpForNextLevel!) * 100}%`,
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
              {user?.streak_days}
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
              {(user?.last_activity_date &&
                Math.floor(
                  (new Date().getTime() -
                    new Date(user.last_activity_date).getTime()) /
                    (1000 * 60 * 60 * 24),
                )) ||
                0}
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
    </SafeAreaView>
  );
}
