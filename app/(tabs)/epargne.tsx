import CircularProgressBar from "@/components/CircularProgressBar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import BottomSheet, { BottomSheetRefProps } from "@/src/components/BottomSheet";
import { getMinWeekly } from "@/src/services/goals/goalsRepo";
import { autoCheckNoSpendDay } from "@/src/services/missions/noSpendDay";
import { getWeeklyPack } from "@/src/services/missions/weekly";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { color } from "@/src/utils/colos";
import { Feather, FontAwesome6, Fontisto } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const { width, height } = Dimensions.get("window");
const CIRCLE_SIZE = 1000;
const R = 45;
const STROKE_WIDTH = 7;

const formatNumberWithCommas = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
// console.log("w", width / 12, "h", height / 12, "R", R / 2);

export default function TabFourScreen() {
  const [weeklyMissions, setWeeklyMissions] = React.useState<any>([]);
  const [weeklyBoosts, setWeeklyBoosts] = React.useState<any[]>([]);
  const [goals, setGoals] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const percentage = useSharedValue(0);
  const end = useSharedValue(0);
  const ref = useRef<BottomSheetRefProps>(null);
  const [open, setOpen] = useState(false);
  const [open2, setOpen2] = useState(false);
  const [date, setDate] = useState(new Date());
  const OPTIONS = [
    { key: "low", label: "Basse" },
    { key: "medium", label: "Moyenne" },
    { key: "high", label: "Haute" },
  ];
  const [epargneData, setEpargneData] = useState({
    name: "",
    target_amount: "0",
    current_amount: "0",
    target_date: "",
    start_date: new Date().toISOString().substring(0, 10),
    priority: "medium",
    min_weekly: "0",
    active: true,
  });

  const toggleDatePicker = () => {
    setOpen(!open);
  };

  const toggleDatePicker2 = () => {
    setOpen2(!open2);
  };

  const onChange = ({ type }: any, selectedDate: any) => {
    if (type === "set") {
      const currentDate = selectedDate;
      setDate(currentDate);

      if (Platform.OS === "android") {
        toggleDatePicker();

        //On attribu la date à la valeur date (currentDate.toLocaleDateString('fr-FR'))
        setEpargneData({
          ...epargneData,
          target_date: currentDate.toISOString().substring(0, 10),
        });
        // setTache({
        //   ...tache,
        //   date: currentDate.toLocaleDateString('fr-FR', options)
        // })
      }
    } else {
      toggleDatePicker();
    }
  };

  const onChange2 = ({ type }: any, selectedDate: any) => {
    if (type === "set") {
      const currentDate = selectedDate;
      setDate(currentDate);

      if (Platform.OS === "android") {
        toggleDatePicker2();

        //On attribu la date à la valeur date (currentDate.toLocaleDateString('fr-FR'))
        setEpargneData({
          ...epargneData,
          start_date: currentDate.toISOString().substring(0, 10),
        });
        // setTache({
        //   ...tache,
        //   date: currentDate.toLocaleDateString('fr-FR', options)
        // })
      }
    } else {
      toggleDatePicker2();
    }
  };

  const confirmIOSDate = () => {
    // console.log(date.toISOString().substring(0, 10));
    setEpargneData({
      ...epargneData,
      target_date: date.toISOString().substring(0, 10),
    });
    toggleDatePicker();
  };

  const confirmIOSDate2 = () => {
    // console.log(date.toISOString().substring(0, 10));
    setEpargneData({
      ...epargneData,
      start_date: date.toISOString().substring(0, 10),
    });
    toggleDatePicker2();
  };

  const calculatePercentage = (current: number, total: number) => {
    if (total === 0) return 0;
    return Math.min(100, Math.round((current / total) * 100));
  };

  const animate = (to: number) => {
    const generatePercentage = calculatePercentage(to, 100);
    percentage.value = withTiming(generatePercentage, { duration: 1000 });
    end.value = withTiming(generatePercentage / 100, { duration: 1000 });
  };

  const toggleSheet = useCallback(() => {
    const isActive = ref.current?.isActive?.();
    ref.current?.scrollTo(isActive ? SCREEN_HEIGHT : -500);
  }, []);

  const ScrollViewRef = useRef<ScrollView>(null);

  const getDatas = async () => {
    setLoading(true);
    const minWeekly = await getMinWeekly();
    console.log("minWeekly", minWeekly);
    const pack = await getWeeklyPack(minWeekly);
    console.log("pack", pack.boosts);
    setWeeklyMissions(pack.mission);
    setWeeklyBoosts(pack.boosts);
    setLoading(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      getDatas();

      (async () => {
        const minWeekly = await getMinWeekly();
        await autoCheckNoSpendDay(minWeekly);
      })();
    }, []),
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={{ flex: 1 }} lightColor={COLORS.secondary}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          nestedScrollEnabled
          contentContainerStyle={{ padding: 20, gap: 22, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl onRefresh={getDatas} refreshing={loading} />
          }
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontFamily: FONT_FAMILY.bold,
                fontSize: 30,
                color: color,
                flexWrap: "wrap",
              }}
            >
              Epargnes
            </Text>

            <TouchableOpacity onPress={toggleSheet}>
              <Feather name="plus-circle" size={40} color={color} />
            </TouchableOpacity>
          </View>

          {/* Mission */}
          <View
            style={{
              backgroundColor: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
              padding: 12,
              borderRadius: 15,
              gap: 8,
            }}
          >
            <View>
              <ThemedText
                style={{ fontFamily: FONT_FAMILY.bold, fontSize: 20 }}
              >
                Missions de la semaine
              </ThemedText>
              <Text
                style={{ fontFamily: FONT_FAMILY.medium, color: COLORS.gray }}
              >
                Gagne des bonus en restant discipliné
              </Text>
            </View>

            <View>
              {weeklyMissions && (
                <View
                  style={{
                    backgroundColor: COLORS.gray + "30",
                    padding: 10,
                    borderRadius: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    width: "100%",
                  }}
                >
                  {weeklyMissions.status === "done" ? (
                    <Feather
                      name="check-circle"
                      size={24}
                      color={COLORS.green}
                    />
                  ) : (
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: COLORS.gray,
                        padding: 10,
                        width: 20,
                        height: 20,
                        borderRadius: 100,
                      }}
                    />
                  )}

                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <ThemedText
                        style={{
                          fontFamily: FONT_FAMILY.semibold,
                          fontSize: 15,
                        }}
                      >
                        {weeklyMissions.title}
                      </ThemedText>
                      <View
                        style={{
                          backgroundColor: COLORS.green,
                          padding: 5,
                          borderRadius: 14,
                          alignItems: "center",
                          justifyContent: "center",
                          alignSelf: "flex-start",
                        }}
                      >
                        <Text
                          style={{
                            color: COLORS.white,
                            fontSize: 12,
                            fontFamily: FONT_FAMILY.medium,
                          }}
                        >
                          +{weeklyMissions.reward_xp} XP
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        fontFamily: FONT_FAMILY.medium,
                        color: COLORS.gray,
                        fontSize: 13,
                        flexWrap: "wrap",
                      }}
                    >
                      {weeklyMissions.description}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={{ gap: 8 }}>
              {weeklyBoosts &&
                weeklyBoosts.length > 0 &&
                weeklyBoosts.map((b) => (
                  <View
                    key={b.id}
                    style={{
                      backgroundColor: COLORS.gray + "30",
                      padding: 10,
                      borderRadius: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      width: "100%",
                    }}
                  >
                    {b.status === "done" ? (
                      <Feather
                        name="check-circle"
                        size={24}
                        color={COLORS.green}
                      />
                    ) : (
                      <View
                        style={{
                          borderWidth: 1,
                          borderColor: COLORS.gray,
                          padding: 10,
                          width: 20,
                          height: 20,
                          borderRadius: 100,
                        }}
                      />
                    )}

                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <ThemedText
                          style={{
                            fontFamily: FONT_FAMILY.semibold,
                            fontSize: 15,
                          }}
                        >
                          {b.title}
                        </ThemedText>
                        <View
                          style={{
                            backgroundColor: COLORS.green,
                            padding: 5,
                            borderRadius: 14,
                            alignItems: "center",
                            justifyContent: "center",
                            alignSelf: "flex-start",
                          }}
                        >
                          <Text
                            style={{
                              color: COLORS.white,
                              fontSize: 12,
                              fontFamily: FONT_FAMILY.medium,
                            }}
                          >
                            +{b.reward_xp} XP
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={{
                          fontFamily: FONT_FAMILY.medium,
                          color: COLORS.gray,
                          fontSize: 13,
                          flexWrap: "wrap",
                        }}
                      >
                        {b.description}
                      </Text>
                    </View>
                  </View>
                ))}
            </View>
          </View>

          {/* Goals */}
          <View>
            <View
              style={{
                backgroundColor:
                  color === "#FFFFFF" ? COLORS.dark : COLORS.white,
                padding: 12,
                borderRadius: 15,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{}}>
                <CircularProgressBar
                  radius={R}
                  strokeWidth={STROKE_WIDTH}
                  percentage={percentage}
                  end={end}
                />
              </View>

              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText
                  style={{ fontFamily: FONT_FAMILY.bold, fontSize: 18 }}
                >
                  Epargne
                </ThemedText>
                <Text
                  style={{
                    fontFamily: FONT_FAMILY.medium,
                    color: COLORS.gray,
                    fontSize: 12,
                  }}
                >
                  Reste 100 000 CFA sur 200 000 CFA
                </Text>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Fontisto name="wallet" size={14} color={COLORS.gray} />
                  <Text
                    style={{
                      fontFamily: FONT_FAMILY.medium,
                      color: COLORS.gray,
                      fontSize: 12,
                    }}
                  >
                    Echeance : Mars 2026
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </ThemedView>

      <BottomSheet ref={ref}>
        <ScrollView
          ref={ScrollViewRef}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 20,
            gap: 20,
            paddingBottom: 150,
            // height: SCREEN_HEIGHT,
            // backgroundColor: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
            zIndex: 999,
            width: "100%",
            // flex: 1,
          }}
        >
          <ThemedText style={{ fontFamily: FONT_FAMILY.bold, fontSize: 22 }}>
            Nouvelle épagne
          </ThemedText>

          <View style={{ gap: 18 }}>
            <View style={{ gap: 8 }}>
              <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                Titre de l'épargne
              </ThemedText>
              <TextInput
                placeholder="Ex: Epargne fin d'année"
                placeholderTextColor={COLORS.gray}
                style={{
                  padding: 16,
                  borderWidth: 1,
                  borderColor: COLORS.gray,
                  color: color,
                  borderRadius: 8,
                  flex: 1,
                  fontFamily: FONT_FAMILY.regular,
                }}
              />
            </View>

            <View style={{ gap: 8 }}>
              <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                Montant cible (CFA)
              </ThemedText>
              <TextInput
                placeholder="Ex: 200 000"
                placeholderTextColor={COLORS.gray}
                style={{
                  padding: 16,
                  borderWidth: 1,
                  borderColor: COLORS.gray,
                  color: color,
                  borderRadius: 8,
                  flex: 1,
                  fontFamily: FONT_FAMILY.regular,
                }}
                keyboardType="numeric"
              />
            </View>

            <View style={{ gap: 8 }}>
              <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                Apport initial (CFA)
              </ThemedText>
              <TextInput
                placeholder="Ex: 0"
                placeholderTextColor={COLORS.gray}
                style={{
                  padding: 16,
                  borderWidth: 1,
                  borderColor: COLORS.gray,
                  color: color,
                  borderRadius: 8,
                  flex: 1,
                  fontFamily: FONT_FAMILY.regular,
                }}
                keyboardType="numeric"
              />
            </View>

            <View style={{ gap: 8 }}>
              <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                Date cible
              </ThemedText>
              <View
                style={{
                  // flexDirection: "row",
                  // alignItems: "center",
                  width: "100%",
                  gap: 8,
                  // justifyContent: "space-between",
                }}
              >
                {open && (
                  <DateTimePicker
                    mode="date"
                    display="spinner"
                    value={date}
                    onChange={onChange}
                    style={{
                      height: 120,
                      marginTop: 20,
                      width: "100%",
                    }}
                    textColor="#000"
                  />
                )}

                {open && Platform.OS === "ios" && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-around",
                      marginBottom: 20,
                    }}
                  >
                    <TouchableOpacity
                      style={{
                        padding: 10,
                        backgroundColor: "gray",
                        borderRadius: 10,
                      }}
                      onPress={toggleDatePicker}
                    >
                      <Text style={{ color: "black", fontWeight: "bold" }}>
                        Annuler
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        padding: 10,
                        backgroundColor: "gray",
                        borderRadius: 10,
                      }}
                      onPress={confirmIOSDate}
                    >
                      <Text style={{ color: "black", fontWeight: "bold" }}>
                        Valider
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!open && (
                  <TouchableOpacity onPress={toggleDatePicker}>
                    <TextInput
                      placeholder="Date cible"
                      placeholderTextColor={COLORS.gray}
                      style={{
                        borderWidth: 1,
                        borderColor: COLORS.gray,
                        padding: 10,
                        borderRadius: 10,
                        color: color,
                        fontFamily: FONT_FAMILY.regular,
                        height: 52,
                        width: "100%",
                      }}
                      editable={false}
                      value={epargneData.target_date}
                      onChangeText={(e: any) =>
                        setEpargneData({
                          ...epargneData,
                          target_date: e,
                        })
                      }
                      onPressIn={toggleDatePicker}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                Date de début
              </ThemedText>
              <View
                style={{
                  // flexDirection: "row",
                  // alignItems: "center",
                  width: "100%",
                  gap: 8,
                  // justifyContent: "space-between",
                }}
              >
                {open2 && (
                  <DateTimePicker
                    mode="date"
                    display="spinner"
                    value={
                      epargneData.start_date
                        ? new Date(epargneData.start_date)
                        : new Date()
                    }
                    onChange={onChange2}
                    style={{
                      height: 120,
                      marginTop: 20,
                      width: "100%",
                    }}
                    textColor="#000"
                  />
                )}

                {open2 && Platform.OS === "ios" && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-around",
                      marginBottom: 20,
                    }}
                  >
                    <TouchableOpacity
                      style={{
                        padding: 10,
                        backgroundColor: "gray",
                        borderRadius: 10,
                      }}
                      onPress={toggleDatePicker}
                    >
                      <Text style={{ color: "black", fontWeight: "bold" }}>
                        Annuler
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        padding: 10,
                        backgroundColor: "gray",
                        borderRadius: 10,
                      }}
                      onPress={confirmIOSDate2}
                    >
                      <Text style={{ color: "black", fontWeight: "bold" }}>
                        Valider
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!open2 && (
                  <TouchableOpacity onPress={toggleDatePicker}>
                    <TextInput
                      placeholder="Date de début"
                      placeholderTextColor={COLORS.gray}
                      style={{
                        borderWidth: 1,
                        borderColor: COLORS.gray,
                        padding: 10,
                        borderRadius: 10,
                        color: color,
                        fontFamily: FONT_FAMILY.regular,
                        height: 52,
                        width: "100%",
                      }}
                      editable={false}
                      value={epargneData.start_date}
                      onChangeText={(e: any) =>
                        setEpargneData({
                          ...epargneData,
                          start_date: e,
                        })
                      }
                      onPressIn={toggleDatePicker2}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                Priorité
              </ThemedText>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: 12,
                      borderWidth: option.key === epargneData.priority ? 2 : 1,
                      borderColor:
                        option.key === epargneData.priority
                          ? COLORS.green
                          : COLORS.gray,
                      padding: 10,
                      width: "30%",
                      justifyContent: "center",
                      backgroundColor:
                        option.key === epargneData.priority
                          ? COLORS.green + "20"
                          : "transparent",
                    }}
                    onPress={() =>
                      setEpargneData({ ...epargneData, priority: option.key })
                    }
                  >
                    <Text
                      style={{
                        color:
                          option.key === epargneData.priority
                            ? COLORS.green
                            : color,
                        fontFamily:
                          option.key === epargneData.priority
                            ? FONT_FAMILY.semibold
                            : FONT_FAMILY.regular,
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View
              style={{
                padding: 12,
                borderWidth: 1,
                borderColor: COLORS.green,
                borderRadius: 12,
                backgroundColor: COLORS.green + "20",
                gap: 12,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <FontAwesome6
                  name="chart-line"
                  size={24}
                  color={COLORS.green}
                />
                <View>
                  <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                    Epargne hebdomadaire mini.
                  </ThemedText>
                  <Text
                    style={{
                      color: COLORS.gray,
                      fontFamily: FONT_FAMILY.medium,
                      fontSize: 12,
                    }}
                  >
                    Montant conseillé pour atteindre votre objectif.
                  </Text>
                </View>
              </View>

              <TextInput
                placeholder="Ex: 0"
                placeholderTextColor={COLORS.gray}
                style={{
                  padding: 12,
                  borderWidth: 1,
                  borderColor: "#14b814",
                  color: color,
                  borderRadius: 16,
                  flex: 1,
                  fontFamily: FONT_FAMILY.regular,
                }}
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: "#14b814",
              padding: 12,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontFamily: FONT_FAMILY.semibold }}>
              Enregistrer l'épargne
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}
