import CircularProgressBar from "@/components/CircularProgressBar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import BottomSheet, { BottomSheetRefProps } from "@/src/components/BottomSheet";
import { listeCategories } from "@/src/db/repositories/category";
import { addTransaction } from "@/src/db/repositories/transactions";
import { addContribution } from "@/src/services/goals/contributions";
import {
  createGoal,
  getMinWeekly,
  listGoals,
} from "@/src/services/goals/goalsRepo";
import { getGoalPlan } from "@/src/services/goals/planner";
import { autoCheckNoSpendDay } from "@/src/services/missions/noSpendDay";
import { ensureWeeklyPackAI } from "@/src/services/missions/weeklyAI";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { useAppTextColor } from "@/src/utils/colos";
import { formatMoney } from "@/src/utils/format";
import { diffDays, toYYYYMMDD } from "@/src/utils/goalDates";
import {
  Feather,
  FontAwesome6,
  Fontisto,
  MaterialIcons,
} from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Platform,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
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
  const color = useAppTextColor();
  const [weeklyMissions, setWeeklyMissions] = React.useState<any>(null);
  const [weeklyBoosts, setWeeklyBoosts] = React.useState<any[]>([]);
  const [goals, setGoals] = React.useState<any[]>([]);
  const [selectedGoals, setSelectedGoals] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loading2, setLoading2] = React.useState(false);
  const percentage = useSharedValue(0);
  const end = useSharedValue(0);
  const ref = useRef<BottomSheetRefProps>(null);
  const [open, setOpen] = useState(false);
  const [open2, setOpen2] = useState(false);
  const [open3, setOpen3] = useState(false);
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
    frequence: "weekly",
  });
  const [periodeDAtats, setPeriodeDAtats] = useState({
    min_dayly: 0,
    min_weekly: 0,
    min_monthly: 0,
  });
  const [inputShown, setInputShown] = useState<"add_goal" | "add_contribution">(
    "add_goal",
  );
  const [contribution, setContribution] = useState({
    amount: "0",
    date: new Date().toISOString().substring(0, 10),
  });
  const [amount, setAmount] = useState<number[]>([]);

  const toggleDatePicker = () => {
    setOpen(!open);
  };

  const toggleDatePicker2 = () => {
    setOpen2(!open2);
  };

  const toggleDatePicker3 = () => {
    setOpen3(!open3);
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

  const onChange3 = ({ type }: any, selectedDate: any) => {
    if (type === "set") {
      const currentDate = selectedDate;
      setDate(currentDate);

      if (Platform.OS === "android") {
        toggleDatePicker3();

        //On attribu la date à la valeur date (currentDate.toLocaleDateString('fr-FR'))
        setContribution({
          ...contribution,
          date: currentDate.toISOString().substring(0, 10),
        });
        // setTache({
        //   ...tache,
        //   date: currentDate.toLocaleDateString('fr-FR', options)
        // })
      }
    } else {
      toggleDatePicker3();
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

  const confirmIOSDate3 = () => {
    // console.log(date.toISOString().substring(0, 10));
    setContribution({
      ...contribution,
      date: date.toISOString().substring(0, 10),
    });
    toggleDatePicker3();
  };

  const calculatePercentage = (current: number, total: number) => {
    if (total === 0) return 0;
    return Math.min(100, Math.round((current / total) * 100));
  };

  const animate = (to: number, total: number) => {
    const generatePercentage = calculatePercentage(to, total);
    // percentage.value = withTiming(generatePercentage, { duration: 1000 });
    // end.value = withTiming(generatePercentage / 100, { duration: 1000 });

    return generatePercentage;
  };

  const toggleSheet = useCallback(() => {
    const isActive = ref.current?.isActive?.();
    ref.current?.scrollTo(isActive ? SCREEN_HEIGHT : -500);
  }, []);

  const ScrollViewRef = useRef<ScrollView>(null);

  const getDatas = async () => {
    setLoading(true);
    // const minWeekly = await getMinWeekly();
    // console.log("minWeekly", minWeekly);
    const pack = await ensureWeeklyPackAI();
    // console.log("pack", pack.boosts);
    setWeeklyMissions(pack.mission);
    setWeeklyBoosts(pack.boosts);

    const allGoals = await listGoals();

    const result = await Promise.all(
      allGoals.map(async (g) => {
        const details = await getGoalPlan(g.id);
        return {
          ...g,
          details,
          percentage: animate(details.saved_amount, g.target_amount),
        };
      }),
    );

    console.log("GOALS ", result);
    setGoals(result);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        try {
          await getDatas();
          const minWeekly = await getMinWeekly();
          if (active) await autoCheckNoSpendDay(minWeekly);
        } catch (e) {
          console.log(e);
        }
      })();

      return () => {
        active = false;
      };
    }, []),
  );

  const removeLastValue = () => {
    if (contribution.amount !== amount.join("")) {
      setAmount([]);
      return;
    }

    setAmount((prevAmount) => prevAmount.slice(0, -1));
  };

  useEffect(() => {
    console.log("epargneData", epargneData);
    if (
      epargneData.target_date === epargneData.start_date ||
      new Date(epargneData.target_date) < new Date(epargneData.start_date)
    ) {
      return;
    }

    const totalDays = Math.max(
      diffDays(
        new Date(epargneData.target_date),
        new Date(epargneData.start_date),
      ),
      0,
    );
    const totalWeeks = Math.max(Math.ceil(totalDays / 7), 1);

    console.log("totalWeeks", totalWeeks);
    console.log("totalDays", totalDays);
    console.log("totalMonth", Math.max(Math.ceil(totalWeeks / 4), 1));

    const remainingAmount =
      parseInt(epargneData.target_amount) -
      parseInt(epargneData.current_amount);
    const minWeekly = Math.ceil(remainingAmount / totalWeeks);
    const minDayly = Math.ceil(remainingAmount / totalDays);
    const minMonthly = Math.ceil(
      remainingAmount / Math.max(Math.ceil(totalWeeks / 4), 1),
    );

    // setEpargneData({
    //   ...epargneData,
    //   min_weekly: minWeekly.toString(),
    // });
    setPeriodeDAtats({
      min_dayly: minDayly ?? 0,
      min_weekly: minWeekly ?? 0,
      min_monthly: minMonthly ?? 0,
    });
  }, [
    epargneData.start_date,
    epargneData.target_date,
    epargneData.target_amount,
    epargneData.current_amount,
  ]);

  useEffect(() => {
    setContribution({
      ...contribution,
      amount: amount.join(""),
    });
  }, [amount]);

  const handleSave = async () => {
    if (
      !epargneData.name ||
      parseInt(epargneData.target_amount) <= 0 ||
      !epargneData.target_date ||
      !epargneData.start_date ||
      parseInt(epargneData.min_weekly) <= 0
    ) {
      // Handle the case where some fields are missing
      alert("Veuillez remplir tous les champs correctement.");
      return;
    }

    setLoading2(true);
    try {
      const goalId = await createGoal({
        name: epargneData.name, // You should replace this with the actual goal ID
        target_amount: parseInt(epargneData.target_amount),
        target_date: epargneData.target_date,
        start_date: epargneData.start_date,
        priority: epargneData.priority as any,
        min_weekly: parseInt(epargneData.min_weekly),
        frequence: epargneData.frequence as any,
      });

      if (parseInt(epargneData.current_amount) > 0) {
        await addContribution({
          goal_id: goalId, // You should replace this with the actual goal ID
          amount: parseInt(epargneData.current_amount),
          date: new Date().toISOString().substring(0, 10),
          source: "auto",
        });
      }

      toggleSheet();
      setEpargneData({
        name: "",
        target_amount: "0",
        current_amount: "0",
        target_date: "",
        start_date: new Date().toISOString().substring(0, 10),
        min_weekly: "0",
        priority: "medium",
        active: true,
        frequence: "weekly",
      });
      setPeriodeDAtats({
        min_dayly: 0,
        min_weekly: 0,
        min_monthly: 0,
      });
      getDatas();
    } catch (error) {
      alert(
        "Une erreur est survenue lors de la création de l'épargne. Veuillez réessayer.",
      );
      console.error("Error creating goal:", error);
    } finally {
      setLoading2(false);
    }
  };

  const handleSaveContribution = async () => {
    if (!contribution.amount || parseInt(contribution.amount) <= 0) {
      alert("Veuillez entrer un montant valide.");
      return;
    }

    setLoading2(true);
    try {
      await addContribution({
        goal_id: selectedGoals.id, // You should replace this with the actual goal ID
        amount: parseInt(contribution.amount),
        date: contribution.date,
        source: "manual",
      });

      const cat = await listeCategories();

      await addTransaction({
        amount: parseInt(contribution.amount),
        type: "depense",
        date: toYYYYMMDD(new Date()),
        note: `Contribution sur l'épargne : ${selectedGoals.name}`,
        category_id: cat.find(
          (c) => c.name.toLowerCase().includes("autre") && c.type === "depense",
        )?.id,
      });

      toggleSheet();
      setContribution({
        amount: "0",
        date: new Date().toISOString().substring(0, 10),
      });
      setAmount([]);
      getDatas();
    } catch (error) {
      alert(
        "Une erreur est survenue lors de l'ajout de la contribution. Veuillez réessayer.",
      );
      console.error("Error adding contribution:", error);
    } finally {
      setLoading2(false);
    }
  };

  const isReady = !loading;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={{ flex: 1 }} lightColor={COLORS.secondary}>
        {(loading || !isReady) && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ThemedText
              style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 18 }}
            >
              Chargement...
            </ThemedText>
          </View>
        )}
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          nestedScrollEnabled
          contentContainerStyle={{ padding: 20, gap: 22, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl onRefresh={getDatas} refreshing={loading} />
          }
        >
          {!isReady ? (
            <View style={{ height: 400 }} />
          ) : (
            <>
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

                <TouchableOpacity
                  onPress={() => {
                    setInputShown("add_goal");
                    toggleSheet();
                  }}
                >
                  <Feather name="plus-circle" size={40} color={color} />
                </TouchableOpacity>
              </View>

              {/* Mission */}
              {goals && goals.length > 0 && (
                <View
                  style={{
                    backgroundColor:
                      color === "#FFFFFF" ? COLORS.dark : COLORS.white,
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
                      style={{
                        fontFamily: FONT_FAMILY.medium,
                        color: COLORS.gray,
                      }}
                    >
                      Gagne des bonus en restant discipliné
                    </Text>
                  </View>

                  <View>
                    {weeklyMissions !== null && (
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
              )}

              {/* Liste épargnes */}
              <View>
                <FlatList
                  data={goals}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      key={item.id}
                      style={{
                        gap: 18,
                        backgroundColor:
                          color === "#FFFFFF" ? COLORS.dark : COLORS.white,
                        padding: 12,
                        borderRadius: 15,
                      }}
                      onPress={() =>
                        router.push({
                          pathname: "/(screens)/DetailGoal",
                          params: { id: item.id },
                        })
                      }
                    >
                      <View
                        style={{
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
                            percentage={item.percentage}
                            end={item.percentage / 100}
                          />
                        </View>

                        <View style={{ flex: 1, gap: 4 }}>
                          <ThemedText
                            style={{
                              fontFamily: FONT_FAMILY.bold,
                              fontSize: 18,
                            }}
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
                            Reste {formatMoney(item.details.remaining_amount)}{" "}
                            CFA sur {formatMoney(item.target_amount)} CFA
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Fontisto
                              name="wallet"
                              size={14}
                              color={COLORS.gray}
                            />
                            <Text
                              style={{
                                fontFamily: FONT_FAMILY.medium,
                                color: COLORS.gray,
                                fontSize: 12,
                              }}
                            >
                              Echeance :{" "}
                              {new Date(item.target_date).toLocaleDateString(
                                "fr-FR",
                                { month: "long", year: "numeric" },
                              )}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          padding: 12,
                          backgroundColor: COLORS.green,
                          borderRadius: 8,
                          justifyContent: "center",
                        }}
                        onPress={() =>
                          Alert.alert(
                            "Epargner",
                            "Epargner le montant défini ou un autre montant ?",
                            [
                              {
                                text: "Montant défini",
                                onPress: async () => {
                                  await addContribution({
                                    goal_id: item.id,
                                    amount: item.min_weekly,
                                    date: new Date()
                                      .toISOString()
                                      .substring(0, 10),
                                    source: "manual",
                                  });
                                  getDatas();
                                },
                              },
                              {
                                text: "Autre montant",
                                onPress: () => {
                                  setSelectedGoals(item);
                                  setInputShown("add_contribution");
                                  toggleSheet();
                                },
                              },
                            ],
                          )
                        }
                      >
                        <MaterialIcons name="savings" size={24} color="white" />
                        <Text
                          style={{
                            color: "white",
                            fontFamily: FONT_FAMILY.semibold,
                            fontSize: 16,
                          }}
                        >
                          Epargner
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  )}
                  scrollEnabled={false}
                  contentContainerStyle={{ gap: 12 }}
                  ListEmptyComponent={() => {
                    return (
                      <View
                        style={{
                          flex: 1,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ThemedText
                          style={{
                            fontFamily: FONT_FAMILY.medium,
                            fontSize: 16,
                          }}
                        >
                          Aucune épargne définie
                        </ThemedText>
                      </View>
                    );
                  }}
                />
              </View>
            </>
          )}
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
            {inputShown === "add_goal"
              ? "Nouvelle épargne"
              : "Nouvelle contribution pour : " +
                (selectedGoals ? selectedGoals.name : "")}
          </ThemedText>

          {inputShown === "add_goal" ? (
            <>
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
                    value={epargneData.name}
                    onChangeText={(e) =>
                      setEpargneData({ ...epargneData, name: e })
                    }
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
                    value={epargneData.target_amount}
                    onChangeText={(e) =>
                      setEpargneData({ ...epargneData, target_amount: e })
                    }
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
                    value={epargneData.current_amount}
                    onChangeText={(e) =>
                      setEpargneData({ ...epargneData, current_amount: e })
                    }
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
                        value={
                          epargneData.target_date
                            ? new Date(epargneData.target_date)
                            : new Date()
                        }
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
                          onPress={toggleDatePicker2}
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
                      <TouchableOpacity onPress={toggleDatePicker2}>
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
                          borderWidth:
                            option.key === epargneData.priority ? 2 : 1,
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
                          setEpargneData({
                            ...epargneData,
                            priority: option.key,
                          })
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
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <FontAwesome6
                      name="chart-line"
                      size={24}
                      color={COLORS.green}
                    />
                    <View>
                      <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                        Epargne périodique mini.
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

                  <View style={{ gap: 12 }}>
                    <TouchableOpacity
                      style={{
                        padding: 12,
                        borderWidth: 1,
                        borderColor:
                          epargneData.frequence === "dayly"
                            ? "#14b814"
                            : COLORS.gray,
                        borderRadius: 16,
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                      onPress={() =>
                        setEpargneData({
                          ...epargneData,
                          frequence: "dayly",
                          min_weekly: periodeDAtats.min_dayly.toString(),
                        })
                      }
                    >
                      <View
                        style={{
                          borderWidth: 1,
                          borderColor: COLORS.gray,
                          width: 15,
                          height: 15,
                          padding: 10,
                          borderRadius: 100,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius:
                              epargneData.frequence === "dayly" ? 5 : 0,
                            backgroundColor:
                              epargneData.frequence === "dayly"
                                ? COLORS.green
                                : "transparent",
                          }}
                        />
                      </View>
                      <Text
                        style={{
                          color:
                            epargneData.frequence === "dayly"
                              ? COLORS.green
                              : color,
                          fontFamily: FONT_FAMILY.medium,
                        }}
                      >
                        Epargne journalière :{" "}
                        {formatMoney(periodeDAtats.min_dayly as any)} CFA
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        padding: 12,
                        borderWidth: 1,
                        borderColor:
                          epargneData.frequence === "weekly"
                            ? "#14b814"
                            : COLORS.gray,
                        borderRadius: 16,
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                      onPress={() =>
                        setEpargneData({
                          ...epargneData,
                          frequence: "weekly",
                          min_weekly: periodeDAtats.min_weekly.toString(),
                        })
                      }
                    >
                      <View
                        style={{
                          borderWidth: 1,
                          borderColor: COLORS.gray,
                          width: 15,
                          height: 15,
                          padding: 10,
                          borderRadius: 100,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius:
                              epargneData.frequence === "weekly" ? 5 : 0,
                            backgroundColor:
                              epargneData.frequence === "weekly"
                                ? COLORS.green
                                : "transparent",
                          }}
                        />
                      </View>
                      <Text
                        style={{
                          color:
                            epargneData.frequence === "weekly"
                              ? COLORS.green
                              : color,
                          fontFamily: FONT_FAMILY.medium,
                        }}
                      >
                        Epargne hebdomadaire :{" "}
                        {formatMoney(periodeDAtats.min_weekly as any)} CFA
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        padding: 12,
                        borderWidth: 1,
                        borderColor:
                          epargneData.frequence === "monthly"
                            ? "#14b814"
                            : COLORS.gray,
                        borderRadius: 16,
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                      onPress={() =>
                        setEpargneData({
                          ...epargneData,
                          frequence: "monthly",
                          min_weekly: periodeDAtats.min_monthly.toString(),
                        })
                      }
                    >
                      <View
                        style={{
                          borderWidth: 1,
                          borderColor: COLORS.gray,
                          width: 15,
                          height: 15,
                          padding: 10,
                          borderRadius: 100,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius:
                              epargneData.frequence === "monthly" ? 5 : 0,
                            backgroundColor:
                              epargneData.frequence === "monthly"
                                ? COLORS.green
                                : "transparent",
                          }}
                        />
                      </View>
                      <Text
                        style={{
                          color:
                            epargneData.frequence === "monthly"
                              ? COLORS.green
                              : color,
                          fontFamily: FONT_FAMILY.medium,
                        }}
                      >
                        Epargne mensuelle :{" "}
                        {formatMoney(periodeDAtats.min_monthly as any)} CFA
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: "#14b814",
                  padding: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  opacity: loading2 ? 0.7 : 1,
                }}
                disabled={loading2}
                onPress={handleSave}
              >
                {loading2 ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={{ color: "#fff", fontFamily: FONT_FAMILY.semibold }}
                  >
                    Enregistrer l'épargne
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {selectedGoals && selectedGoals.status === "behind" && (
                <View
                  style={{
                    padding: 12,
                    backgroundColor: COLORS.gray,
                    borderRadius: 20,
                    flexDirection: "row",
                    // alignItems: "center",
                    gap: 9,
                  }}
                >
                  <Feather
                    name="alert-octagon"
                    size={40}
                    color={COLORS.primary}
                  />
                  <View>
                    <Text style={{ fontFamily: FONT_FAMILY.semibold }}>
                      Budget alerte
                    </Text>
                    <Text
                      style={{
                        fontFamily: FONT_FAMILY.regular,
                        flexWrap: "wrap",
                        maxWidth: "90%",
                      }}
                    >
                      {selectedGoals && selectedGoals.details.message}
                    </Text>
                    <TouchableOpacity
                      style={{
                        padding: 10,
                        backgroundColor: COLORS.primary,
                        justifyContent: "center",
                        alignItems: "center",
                        borderRadius: 15,
                      }}
                      onPress={() => {
                        setContribution({
                          ...contribution,
                          amount:
                            selectedGoals.frequence === "weekly"
                              ? selectedGoals.details.recommended_weekly.toString()
                              : selectedGoals.frequence === "monthly"
                                ? selectedGoals.details.recommended_monthly.toString()
                                : selectedGoals.details.recommended_daily.toString(),
                        });
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontFamily: FONT_FAMILY.medium,
                        }}
                      >
                        Appliquer
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={{ gap: 18 }}>
                <View style={{ gap: 8 }}>
                  <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                    Date
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
                    {open3 && (
                      <DateTimePicker
                        mode="date"
                        display="spinner"
                        value={
                          contribution.date
                            ? new Date(contribution.date)
                            : new Date()
                        }
                        onChange={onChange3}
                        style={{
                          height: 120,
                          marginTop: 20,
                          width: "100%",
                        }}
                        textColor="#000"
                      />
                    )}

                    {open3 && Platform.OS === "ios" && (
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
                          onPress={toggleDatePicker3}
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
                          onPress={confirmIOSDate3}
                        >
                          <Text style={{ color: "black", fontWeight: "bold" }}>
                            Valider
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {!open3 && (
                      <TouchableOpacity onPress={toggleDatePicker3}>
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
                          value={contribution.date}
                          onChangeText={(e: any) =>
                            setContribution({
                              ...contribution,
                              date: e,
                            })
                          }
                          onPressIn={toggleDatePicker3}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View
                  style={{
                    gap: 8,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ThemedText style={{ fontFamily: FONT_FAMILY.regular }}>
                    Montant (CFA)
                  </ThemedText>
                  <TextInput
                    placeholder="0"
                    keyboardType="numeric"
                    style={{
                      fontFamily: FONT_FAMILY.bold,
                      fontSize: 24,
                      width: "100%",
                      color: color,
                      textAlign: "center",
                    }}
                    editable={false}
                    readOnly={true}
                    placeholderTextColor={color}
                    onChangeText={(e) =>
                      setContribution({
                        ...contribution,
                        amount: e,
                      })
                    }
                    value={contribution.amount}
                  />
                </View>

                <View style={{ gap: 18 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    {[1, 2, 3].map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        style={{
                          padding: 12,
                          width: "30%",
                          backgroundColor: COLORS.gray,
                          borderRadius: 22,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                        onPress={() => setAmount([...amount, preset])}
                      >
                        <Text
                          style={{
                            color: COLORS.noir,
                            fontFamily: FONT_FAMILY.bold,
                          }}
                        >
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    {[4, 5, 6].map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        style={{
                          padding: 12,
                          width: "30%",
                          backgroundColor: COLORS.gray,
                          borderRadius: 22,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                        onPress={() => setAmount([...amount, preset])}
                      >
                        <Text
                          style={{
                            color: COLORS.noir,
                            fontFamily: FONT_FAMILY.bold,
                          }}
                        >
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    {[7, 8, 9].map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        style={{
                          padding: 12,
                          width: "30%",
                          backgroundColor: COLORS.gray,
                          borderRadius: 22,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                        onPress={() => setAmount([...amount, preset])}
                      >
                        <Text
                          style={{
                            color: COLORS.noir,
                            fontFamily: FONT_FAMILY.bold,
                          }}
                        >
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ width: "30%" }} />
                    <TouchableOpacity
                      style={{
                        padding: 12,
                        width: "30%",
                        backgroundColor: COLORS.gray,
                        borderRadius: 22,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      onPress={() => setAmount([...amount, 0])}
                    >
                      <Text
                        style={{
                          color: COLORS.noir,
                          fontFamily: FONT_FAMILY.bold,
                        }}
                      >
                        0
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        padding: 12,
                        width: "30%",
                        backgroundColor: COLORS.gray,
                        borderRadius: 22,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      onPress={removeLastValue}
                    >
                      <Feather name="delete" size={24} color={COLORS.noir} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: "#14b814",
                  padding: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  opacity: loading2 ? 0.7 : 1,
                }}
                disabled={loading2}
                onPress={handleSaveContribution}
              >
                {loading2 ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={{ color: "#fff", fontFamily: FONT_FAMILY.semibold }}
                  >
                    Ajouter la contribution
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}
