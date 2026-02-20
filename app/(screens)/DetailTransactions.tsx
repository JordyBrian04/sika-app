import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import { useThemeColor } from "@/hooks/use-theme-color";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { formatMoney } from "@/src/utils/format";
import { AntDesign, Feather, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const DetailTransactions = () => {
  const color = useThemeColor({ light: "#000000", dark: "#FFFFFF" }, "text");
  const { id, amount, note, date, name, type, created_at }: any =
    useLocalSearchParams();
  console.log("Transaction details:", {
    id,
    amount,
    note,
    date,
    name,
    type,
    created_at,
  });
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1, padding: 20 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 22, paddingBottom: 100 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 40,
            }}
          >
            <TouchableOpacity onPress={() => router.back()}>
              <AntDesign name="left" size={24} color={color} />
            </TouchableOpacity>
            <ThemedText
              style={{
                fontSize: 20,
                textAlign: "center",
                fontFamily: FONT_FAMILY.bold,
              }}
            >
              Détails de la transaction
            </ThemedText>
          </View>

          <View
            style={{ gap: 12, alignItems: "center", justifyContent: "center" }}
          >
            <Text
              style={{
                fontFamily: FONT_FAMILY.bold,
                color: type === "depense" ? COLORS.red : COLORS.green,
                fontSize: 30,
              }}
            >
              {type === "depense"
                ? `-${formatMoney(amount)} CFA`
                : `${formatMoney(amount)} CFA`}
            </Text>
            <View
              style={{
                backgroundColor:
                  type === "depense" ? COLORS.red + "20" : COLORS.green + "20",
                padding: 8,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Image
                source={
                  name.toLowerCase().includes("alimentation")
                    ? require("../../assets/images/diet.png")
                    : name.toLowerCase().includes("transport")
                      ? require("../../assets/images/transportation.png")
                      : name.toLowerCase().includes("facture")
                        ? require("../../assets/images/bill.png")
                        : name.toLowerCase().includes("abonnement")
                          ? require("../../assets/images/membership.png")
                          : name.toLowerCase().includes("sante")
                            ? require("../../assets/images/pills.png")
                            : name.toLowerCase().includes("loisirs")
                              ? require("../../assets/images/theater.png")
                              : name.toLowerCase().includes("salaire")
                                ? require("../../assets/images/payroll.png")
                                : name.toLowerCase().includes("depart")
                                  ? require("../../assets/images/salary.png")
                                  : name.toLowerCase().includes("mission")
                                    ? require("../../assets/images/mission.png")
                                    : name.toLowerCase().includes("famille")
                                      ? require("../../assets/images/big-family.png")
                                      : name.toLowerCase().includes("education")
                                        ? require("../../assets/images/stack-of-books.png")
                                        : name
                                              .toLowerCase()
                                              .includes("shopping")
                                          ? require("../../assets/images/online-shopping.png")
                                          : name
                                                .toLowerCase()
                                                .includes("téléphone/internet")
                                            ? require("../../assets/images/iphone.png")
                                            : name
                                                  .toLowerCase()
                                                  .includes("soin")
                                              ? require("../../assets/images/lotions.png")
                                              : require("../../assets/images/shapes.png")
                }
                style={{ width: 30, height: 30 }}
              />
              <Text
                style={{
                  fontFamily: FONT_FAMILY.medium,
                  color: type === "depense" ? COLORS.red : COLORS.green,
                  fontSize: 16,
                }}
              >
                {name}
              </Text>
            </View>

            <View style={{ marginTop: 40, gap: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Feather name="calendar" size={24} color={COLORS.gray} />
                  <Text
                    style={{
                      fontFamily: FONT_FAMILY.medium,
                      fontSize: 15,
                      color: COLORS.gray,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    Date de la transaction :{" "}
                  </Text>
                </View>
                <ThemedText
                  style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 15 }}
                >
                  {formatDate(date)}
                </ThemedText>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <MaterialIcons
                    name="access-time-filled"
                    size={24}
                    color={COLORS.gray}
                  />
                  <Text
                    style={{
                      fontFamily: FONT_FAMILY.medium,
                      fontSize: 15,
                      color: COLORS.gray,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    Heure de la transaction :{" "}
                  </Text>
                </View>
                <ThemedText
                  style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 15 }}
                >
                  {created_at.split(" ")[1]}
                </ThemedText>
              </View>

              <View>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <MaterialIcons name="notes" size={24} color={COLORS.gray} />
                  <Text
                    style={{
                      fontFamily: FONT_FAMILY.medium,
                      fontSize: 15,
                      color: COLORS.gray,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    Note :{" "}
                  </Text>
                </View>
                <ThemedText
                  style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 15 }}
                >
                  {note}
                </ThemedText>
              </View>
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
};

export default DetailTransactions;
