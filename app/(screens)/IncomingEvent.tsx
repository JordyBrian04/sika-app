import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
    listPendingRecurringOccurrences,
    listUpcomingRecurring,
} from "@/src/db/repositories/recurringRepo";
import {
    markRecurringOccurrencePaid,
    markRecurringOccurrenceSkipped,
} from "@/src/services/recurring/validation";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { formatMoney } from "@/src/utils/format";
import { AntDesign, Foundation } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
    FlatList,
    Image,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const IncomingEvent = () => {
  const color = useThemeColor({ light: "#000000", dark: "#FFFFFF" }, "text");
  const [paiementsEnRetard, setPaiementsEnRetard] = React.useState<any[]>([]);
  const [paiementsAvenir, setPaiementsAvenir] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchPaiements = async () => {
    setLoading(true);
    const allDuePaiements = await listPendingRecurringOccurrences(100);
    setPaiementsEnRetard(allDuePaiements);
    console.log("All due paiements:", allDuePaiements);

    const allPaiements = await listUpcomingRecurring(100);
    setPaiementsAvenir(allPaiements);
    console.log("All upcoming paiements:", allPaiements);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchPaiements();
    }, []),
  );

  const renderDuePaiementItem = (item: any) => (
    <ThemedView
      style={{
        padding: 12,
        borderRadius: 8,
        backgroundColor: color === "#FFFFFF" ? COLORS.dark : COLORS.secondary,
        gap: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Image
          source={
            item.name.toLowerCase().includes("netflix")
              ? require("../../assets/images/netflix.png")
              : item.name.toLowerCase().includes("loyer")
                ? require("../../assets/images/3d-house.png")
                : item.name.toLowerCase().includes("amazon")
                  ? require("../../assets/images/amazon.png")
                  : item.name.toLowerCase().includes("facture")
                    ? require("../../assets/images/bill.png")
                    : item.name.toLowerCase().includes("canca")
                      ? require("../../assets/images/canva.jpg")
                      : item.name.toLowerCase().includes("chatgpt")
                        ? require("../../assets/images/chatgpt.png")
                        : item.name.toLowerCase().includes("facebook")
                          ? require("../../assets/images/facebook.png")
                          : item.name.toLowerCase().includes("gemini")
                            ? require("../../assets/images/gemini.jpg")
                            : item.name.toLowerCase().includes("spotify")
                              ? require("../../assets/images/spotify.png")
                              : item.name.toLowerCase().includes("instagram")
                                ? require("../../assets/images/instagram.png")
                                : item.name.toLowerCase().includes("prime")
                                  ? require("../../assets/images/prime.png")
                                  : item.name.toLowerCase().includes("tiktok")
                                    ? require("../../assets/images/tiktok.png")
                                    : item.name.toLowerCase().includes("upwork")
                                      ? require("../../assets/images/upwork.png")
                                      : item.name
                                            .toLowerCase()
                                            .includes("youtube")
                                        ? require("../../assets/images/youtube.png")
                                        : require("../../assets/images/schedule.png")
          }
          style={{
            width: 50,
            height: 50,
            borderRadius: 16,
            resizeMode: "cover",
          }}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
            {item.name}
          </ThemedText>
          <Text
            style={{
              fontFamily: FONT_FAMILY.medium,
              color: item.daysLate <= 7 ? COLORS.orange : COLORS.red,
              fontSize: 12,
            }}
          >
            En retard depuis {item.daysLate} jours
          </Text>
        </View>

        <ThemedText style={{ fontFamily: FONT_FAMILY.bold }}>
          {formatMoney(item.amount)} CFA
        </ThemedText>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor:
              color === "#FFFFFF" ? COLORS.secondary : COLORS.dark,
            padding: 12,
            borderRadius: 15,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={async () => [
            await markRecurringOccurrencePaid(item.id),
            fetchPaiements(),
          ]}
        >
          <Text
            style={{
              fontFamily: FONT_FAMILY.bold,
              color: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
              fontSize: 13,
            }}
          >
            Payer maintenant
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: COLORS.red + "30",
            padding: 12,
            borderRadius: 15,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={async () => {
            await markRecurringOccurrenceSkipped(item.id);
            fetchPaiements();
          }}
        >
          <Text
            style={{
              fontFamily: FONT_FAMILY.bold,
              color: COLORS.red,
              fontSize: 13,
            }}
          >
            Ignorer le paiement
          </Text>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );

  const renderIncomingPaiementItem = (item: any) => (
    <ThemedView
      style={{
        padding: 12,
        borderRadius: 12,
        backgroundColor: color === "#FFFFFF" ? COLORS.dark : COLORS.secondary,
        gap: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Image
          source={
            item.name.toLowerCase().includes("netflix")
              ? require("../../assets/images/netflix.png")
              : item.name.toLowerCase().includes("loyer")
                ? require("../../assets/images/3d-house.png")
                : item.name.toLowerCase().includes("amazon")
                  ? require("../../assets/images/amazon.png")
                  : item.name.toLowerCase().includes("facture")
                    ? require("../../assets/images/bill.png")
                    : item.name.toLowerCase().includes("canca")
                      ? require("../../assets/images/canva.jpg")
                      : item.name.toLowerCase().includes("chatgpt")
                        ? require("../../assets/images/chatgpt.png")
                        : item.name.toLowerCase().includes("facebook")
                          ? require("../../assets/images/facebook.png")
                          : item.name.toLowerCase().includes("gemini")
                            ? require("../../assets/images/gemini.jpg")
                            : item.name.toLowerCase().includes("spotify")
                              ? require("../../assets/images/spotify.png")
                              : item.name.toLowerCase().includes("instagram")
                                ? require("../../assets/images/instagram.png")
                                : item.name.toLowerCase().includes("prime")
                                  ? require("../../assets/images/prime.png")
                                  : item.name.toLowerCase().includes("tiktok")
                                    ? require("../../assets/images/tiktok.png")
                                    : item.name.toLowerCase().includes("upwork")
                                      ? require("../../assets/images/upwork.png")
                                      : item.name
                                            .toLowerCase()
                                            .includes("youtube")
                                        ? require("../../assets/images/youtube.png")
                                        : require("../../assets/images/schedule.png")
          }
          style={{
            width: 50,
            height: 50,
            borderRadius: 16,
            resizeMode: "cover",
          }}
        />
        <View style={{ flex: 1, marginLeft: 10, gap: 5 }}>
          <ThemedText
            style={{ fontFamily: FONT_FAMILY.semibold }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.name}
          </ThemedText>
          <Text
            style={{
              fontFamily: FONT_FAMILY.medium,
              color: COLORS.gray,
              fontSize: 12,
            }}
          >
            {formatDate(item.next_date)}
          </Text>
        </View>

        <View style={{ gap: 5 }}>
          <ThemedText style={{ fontFamily: FONT_FAMILY.bold }}>
            {formatMoney(item.amount)} CFA
          </ThemedText>
          <Text
            style={{
              fontSize: 12,
              color: COLORS.green,
              textAlign: "right",
              fontFamily: FONT_FAMILY.regular,
              backgroundColor: COLORS.green + "20",
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 12,
            }}
          >
            {item.frequency === "semaine"
              ? "Chaque semaine"
              : item.frequency === "mensuel"
                ? "Chaque mois"
                : item.frequency === "annuel"
                  ? "Chaque année"
                  : `Tous les ${item.interval_count} jours`}
          </Text>
        </View>
      </View>
    </ThemedView>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 22, paddingBottom: 100, padding: 16 }}
          refreshControl={
            <RefreshControl onRefresh={fetchPaiements} refreshing={loading} />
          }
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 20,
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
              Liste des paiements à venir
            </ThemedText>
          </View>

          {/* Paiements en retard */}
          <View style={{ marginTop: 22, gap: 22 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Foundation name="alert" size={24} color={COLORS.orange} />
              <ThemedText
                style={{ fontFamily: FONT_FAMILY.bold, fontSize: 22 }}
              >
                Paiements en retard
              </ThemedText>
            </View>

            <View>
              <FlatList
                data={paiementsEnRetard}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => renderDuePaiementItem(item)}
                scrollEnabled={false}
                contentContainerStyle={{ gap: 12 }}
                ListEmptyComponent={() => (
                  <View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      flex: 1,
                      gap: 12,
                    }}
                  >
                    <ThemedText
                      style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 17 }}
                    >
                      Aucun paiement en retard
                    </ThemedText>
                  </View>
                )}
              />
            </View>
          </View>

          {/* Paiements à venir */}
          <View style={{ marginTop: 22, gap: 22 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              {/* <Foundation name="alert" size={24} color={COLORS.orange} /> */}
              <ThemedText
                style={{ fontFamily: FONT_FAMILY.bold, fontSize: 22 }}
              >
                Paiements à venir
              </ThemedText>
            </View>

            <View>
              <FlatList
                data={paiementsAvenir}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => renderIncomingPaiementItem(item)}
                scrollEnabled={false}
                contentContainerStyle={{ gap: 12 }}
                ListEmptyComponent={() => (
                  <View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      flex: 1,
                      gap: 12,
                    }}
                  >
                    <ThemedText
                      style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 17 }}
                    >
                      Aucun paiement à venir
                    </ThemedText>
                  </View>
                )}
              />
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
};

export default IncomingEvent;
