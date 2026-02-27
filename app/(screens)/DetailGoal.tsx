import CircularProgressBar from "@/components/CircularProgressBar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import { BottomSheetRefProps } from "@/src/components/BottomSheet";
import ProgressBar from "@/src/components/ProgressBar";
import { Slider } from "@/src/components/Slider";
import { getCatWithMoreExpense } from "@/src/db/repositories/budgetRepo";
import { getMonthlyExpense } from "@/src/db/repositories/financeRepo";
import {
  getAIInsights,
  getAIInsightsTop3,
} from "@/src/services/goals/aiInsights";
import {
  addContribution,
  listContributions,
} from "@/src/services/goals/contributions";
import {
  deleteGoal,
  getGoal,
  updateGoal,
  weeklyHistory,
} from "@/src/services/goals/goalsRepo";
import { getGoalProjection } from "@/src/services/goals/insights";
import { getGoalPlan } from "@/src/services/goals/planner";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { useModalQueue } from "@/src/ui/components/useModalQueue";
import { color } from "@/src/utils/colos";
import { formatMoney } from "@/src/utils/format";
import { diffDays } from "@/src/utils/goalDates";
import {
  AntDesign,
  Feather,
  FontAwesome,
  FontAwesome5,
  FontAwesome6,
  Fontisto,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const R = 70;
const STROKE_WIDTH = 14;

const DetailGoal = () => {
  const { id } = useLocalSearchParams();
  const [goals, setGoals] = React.useState<any>(null);
  const [goalDetails, setGoalDetails] = React.useState<any>(null);
  const [goalProjections, setGoalProjections] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [barData, setBarData] = React.useState<any>([]);
  const [sliderData, setSliderData] = React.useState<any>([]);
  const [contributions, setContributions] = React.useState<any>([]);
  const [offset, setOffset] = useState(5);
  const [page, setPage] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [datas, setDatas] = useState<any>([]);
  const { openModal, closeModal, isVisible } = useModalQueue();
  const [epargneData, setEpargneData] = useState({
    id: 0,
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
  const [selectedGoals, setSelectedGoals] = React.useState<any | null>(null);
  const [loading2, setLoading2] = React.useState(false);
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

  const ScrollViewRef = useRef<ScrollView>(null);

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
      await updateGoal(id as any, {
        name: epargneData.name, // You should replace this with the actual goal ID
        target_amount: parseInt(epargneData.target_amount),
        target_date: epargneData.target_date,
        priority: epargneData.priority as any,
        min_weekly: parseInt(epargneData.min_weekly),
        frequence: epargneData.frequence as any,
      });

      closeModal();
      setPeriodeDAtats({
        min_dayly: 0,
        min_weekly: 0,
        min_monthly: 0,
      });

      router.back();
    } catch (error) {
      alert(
        "Une erreur est survenue lors de la mise à jour de l'épargne. Veuillez réessayer.",
      );
      console.error("Error updating goal:", error);
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
        goal_id: id as any, // You should replace this with the actual goal ID
        amount: parseInt(contribution.amount),
        date: contribution.date,
        source: "manual",
      });

      closeModal();
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

  useEffect(() => {
    const start = selectedIndex * offset;
    const end = start + offset;
    const currentPageData = datas.slice(start, end);
    setContributions(currentPageData);
    setPage(Math.ceil(datas.length / offset));
  }, [datas, selectedIndex, offset]);

  const generateFullWeeklyHistory = (startDate: any, contributions: any) => {
    const start = new Date(startDate);
    const today = new Date();

    // Calculer le nombre total de semaines entre le début et aujourd'hui
    const diffInTime = today.getTime() - start.getTime();
    const totalWeeks = Math.max(
      Math.ceil(diffInTime / (1000 * 3600 * 24 * 7)),
      1,
    );

    const fullHistory = [];

    for (let i = 0; i < totalWeeks; i++) {
      // Calculer la date de début de cette semaine spécifique
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + i * 7);
      const weekNum = i + 1;

      // Trouver si on a une contribution pour cette semaine dans les données SQL
      // (En supposant que ton SQL renvoie 'week_num' commençant à 1)
      const record = contributions.find((c: any) => c.week_num === weekNum);

      fullHistory.push({
        label: `S${weekNum}`,
        frontColor: weekNum === totalWeeks ? COLORS.green : "#888888", // Mettre en évidence la semaine en cours
        value: record ? record.weekly_sum : 0, // 0 si rien trouvé
      });
    }

    return fullHistory.reverse(); // Inverser pour avoir la semaine la plus récente en haut
  };

  const formatValue = (val: number) => {
    if (val >= 1000) {
      return (val / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    }
    return val.toString();
  };

  const getDatas = async () => {
    setLoading(true);
    const goals = await getGoal(id as any);
    setGoals(goals);
    console.log("goal", goals);

    const details = await getGoalPlan(id as any);
    setGoalDetails(details);
    console.log("goalDetails", details);
    setEpargneData({
      id: id as any,
      name: goals?.name ?? "",
      target_amount: goals?.target_amount?.toString() ?? "0",
      current_amount: details?.saved_amount?.toString() ?? "0",
      target_date: goals?.target_date ?? "",
      start_date: goals?.start_date ?? "",
      priority: goals?.priority ?? "medium",
      min_weekly: goals?.min_weekly?.toString() ?? "0",
      active: goals?.active === 1,
      frequence: goals?.frequence ?? "weekly",
    });

    const weeklyContribution = await weeklyHistory(id as any);
    const fullWeeklyHistory = generateFullWeeklyHistory(
      goals?.start_date,
      weeklyContribution,
    );
    const formatData = fullWeeklyHistory.map((item) => ({
      ...item,
      topLabelComponent: () => (
        <View style={{ marginBottom: 4, alignItems: "center", width: 40 }}>
          <ThemedText
            style={{
              // color: item.value === 0 ? "transparent" : color, // Cache le "0" si tu veux
              fontSize: 10,
              fontFamily: FONT_FAMILY.medium,
              textAlign: "center",
            }}
          >
            {formatValue(item.value)}
          </ThemedText>
        </View>
      ),
    }));
    setBarData(formatData);

    setGoalProjections(await getGoalProjection(id as any));

    const month = new Date().getMonth() + 1; // getMonth() est 0-indexé
    const year = new Date().getFullYear();

    const getCat = await getCatWithMoreExpense(month, year);

    const insight = await getAIInsights({
      focusCategoryId: getCat?.category_id,
      focusCategoryName: getCat?.category_name,
      goalId: id as any,
    });

    const budgetInfo = await getMonthlyExpense();

    const insights = await getAIInsightsTop3({
      lookbackDays: 60,
      focusCategoryId: getCat?.category_id ?? null, // par ex catégorie "Loisirs"
      monthlyBudgetTotal: budgetInfo?.totalBudget ?? 20000, // si tu as
    });
    setSliderData(insights);

    const contribs = await listContributions(id as any, 1000);
    // console.log("contributions", contribs);
    setDatas(contribs);

    setLoading(false);
  };

  const calculatePercentage = (current: number, total: number) => {
    if (total === 0) return 0;
    return Math.min(100, Math.round((current / total) * 100));
  };

  useFocusEffect(
    React.useCallback(() => {
      getDatas();
    }, [id]),
  );

  const renderItem = ({ item }: any) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 10,
        gap: 8,
      }}
    >
      <View
        style={{
          padding: 8,
          width: 40,
          height: 40,
          backgroundColor: COLORS.gray + "30",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 20,
        }}
      >
        {item.source === "manual" ? (
          <FontAwesome6 name="money-bills" size={18} color={COLORS.gray} />
        ) : item.source === "roundup" ? (
          <FontAwesome name="circle" size={18} color={COLORS.gray} />
        ) : (
          <Fontisto name="spinner-refresh" size={18} color={COLORS.gray} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={{ fontSize: 14, fontFamily: FONT_FAMILY.semibold }}>
          {item.source === "manual"
            ? "Dépôt manuel"
            : item.source === "roundup"
              ? "Arrondi mensuel"
              : "Virement automatique"}
        </ThemedText>
        <Text
          style={{
            fontSize: 12,
            fontFamily: FONT_FAMILY.regular,
            color: COLORS.gray,
          }}
        >
          {new Date(item.date).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 14,
          fontFamily: FONT_FAMILY.semibold,
          color: COLORS.green,
        }}
      >
        {formatMoney(item.amount)} CFA
      </Text>
    </View>
  );

  const renderFooter = () => (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 10,
        gap: 7,
      }}
    >
      <TouchableOpacity
        disabled={selectedIndex === 0}
        onPress={() => setSelectedIndex((prev) => Math.max(prev - 1, 0))}
        style={{ paddingVertical: 8, paddingHorizontal: 15 }}
      >
        <AntDesign
          name="left"
          size={24}
          color={selectedIndex === 0 ? "gray" : COLORS.primary}
        />
      </TouchableOpacity>
      <ThemedText style={{ fontFamily: FONT_FAMILY.regular, fontSize: 15 }}>
        {selectedIndex + 1} / {page}
      </ThemedText>
      <TouchableOpacity
        disabled={selectedIndex + 1 >= page}
        onPress={() => setSelectedIndex((prev) => Math.min(prev + 1, page - 1))}
        style={{ paddingVertical: 8, paddingHorizontal: 15 }}
        // style={[styles.button, (selectedIndex + 1 >= page) && styles.disabledButton]}
      >
        <AntDesign
          name="right"
          size={24}
          color={selectedIndex + 1 >= page ? "gray" : COLORS.primary}
        />
      </TouchableOpacity>
    </View>
  );

  if (loading || !goals || !goalDetails) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ThemedView
          lightColor={COLORS.secondary}
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: COLORS.gray, fontSize: 16 }}>
            Chargement...
          </Text>
        </ThemedView>
      </SafeAreaView>
    );
  }

  function epargneModal() {
    return (
      <Modal
        visible={isVisible("epargneModal")}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, justifyContent: "flex-end", width: "100%" }}
          >
            <View
              style={{
                width: "100%",
                backgroundColor:
                  color === "#ffffff" ? COLORS.white : COLORS.dark,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                position: "absolute",
                bottom: 0,
                paddingBottom: 70,
                gap: 20,
                maxHeight: "90%",
                //   alignItems: "center",
              }}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 20 }}
                keyboardShouldPersistTaps="always"
                // style={{ maxHeight: "70%" }}
              >
                <TouchableOpacity
                  style={{
                    padding: 10,
                    backgroundColor: COLORS.secondary,
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    alignItems: "center",
                    justifyContent: "center",
                    alignSelf: "flex-end",
                  }}
                  onPress={closeModal}
                >
                  <MaterialCommunityIcons
                    name="close-thick"
                    size={24}
                    color="black"
                  />
                </TouchableOpacity>

                <ThemedText
                  style={{ fontFamily: FONT_FAMILY.bold, fontSize: 22 }}
                >
                  {inputShown === "add_goal"
                    ? "Nouvelle épargne"
                    : "Nouvelle contribution pour : " +
                      (selectedGoals ? selectedGoals.name : "")}
                </ThemedText>

                {inputShown === "add_goal" ? (
                  <>
                    <View style={{ gap: 18 }}>
                      <View style={{ gap: 8 }}>
                        <ThemedText
                          style={{ fontFamily: FONT_FAMILY.semibold }}
                        >
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
                        <ThemedText
                          style={{ fontFamily: FONT_FAMILY.semibold }}
                        >
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
                        <ThemedText
                          style={{ fontFamily: FONT_FAMILY.semibold }}
                        >
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
                                <Text
                                  style={{ color: "black", fontWeight: "bold" }}
                                >
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
                                <Text
                                  style={{ color: "black", fontWeight: "bold" }}
                                >
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
                        <ThemedText
                          style={{ fontFamily: FONT_FAMILY.semibold }}
                        >
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
                                <Text
                                  style={{ color: "black", fontWeight: "bold" }}
                                >
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
                                <Text
                                  style={{ color: "black", fontWeight: "bold" }}
                                >
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
                        <ThemedText
                          style={{ fontFamily: FONT_FAMILY.semibold }}
                        >
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
                            <ThemedText
                              style={{ fontFamily: FONT_FAMILY.semibold }}
                            >
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
                                min_weekly:
                                  periodeDAtats.min_monthly.toString(),
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
                              {formatMoney(periodeDAtats.min_monthly as any)}{" "}
                              CFA
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
                          style={{
                            color: "#fff",
                            fontFamily: FONT_FAMILY.semibold,
                          }}
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
                        <ThemedText
                          style={{ fontFamily: FONT_FAMILY.semibold }}
                        >
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
                                <Text
                                  style={{ color: "black", fontWeight: "bold" }}
                                >
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
                                <Text
                                  style={{ color: "black", fontWeight: "bold" }}
                                >
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
                            <Feather
                              name="delete"
                              size={24}
                              color={COLORS.noir}
                            />
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
                          style={{
                            color: "#fff",
                            fontFamily: FONT_FAMILY.semibold,
                          }}
                        >
                          Ajouter la contribution
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView lightColor={COLORS.secondary} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1, padding: 20 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 22, paddingBottom: 100 }}
          contentInsetAdjustmentBehavior="automatic"
          nestedScrollEnabled
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 65,
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
              Détails épargne
            </ThemedText>
          </View>

          {/*  */}
          <View
            style={{
              padding: 12,
              borderRadius: 15,
              backgroundColor: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
              justifyContent: "center",
              alignItems: "center",
              gap: 18,
            }}
          >
            <CircularProgressBar
              radius={R}
              strokeWidth={STROKE_WIDTH}
              percentage={calculatePercentage(
                goalDetails?.saved_amount,
                goals?.target_amount,
              )}
              end={
                calculatePercentage(
                  goalDetails?.saved_amount,
                  goals?.target_amount,
                ) / 100
              }
            />

            <ThemedText style={{ fontSize: 18, fontFamily: FONT_FAMILY.bold }}>
              {goals ? goals.name : " "}
            </ThemedText>

            <View
              style={{ justifyContent: "center", alignItems: "center", gap: 6 }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: FONT_FAMILY.medium,
                  color: COLORS.gray,
                  textAlign: "center",
                }}
              >
                Reste à épargner
              </Text>
              <ThemedText
                style={{ fontSize: 20, fontFamily: FONT_FAMILY.bold }}
              >
                {formatMoney(goalDetails?.remaining_amount)} CFA
              </ThemedText>
            </View>

            <View
              style={{
                width: "100%",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "row",
                gap: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  justifyContent: "center",
                  borderWidth: 1,
                  padding: 8,
                  borderRadius: 25,
                  borderColor:
                    goalDetails.status === "ahead"
                      ? COLORS.green
                      : goalDetails.status === "on_track"
                        ? COLORS.blue
                        : COLORS.red,
                  backgroundColor:
                    goalDetails.status === "ahead"
                      ? COLORS.green + "20"
                      : goalDetails.status === "on_track"
                        ? COLORS.blue + "20"
                        : COLORS.red + "20",
                }}
              >
                <Image
                  source={
                    goalDetails.status === "ahead"
                      ? require("../../assets/images/trend.png")
                      : goalDetails.status === "on_track"
                        ? require("../../assets/images/minus.png")
                        : require("../../assets/images/downtrend.png")
                  }
                  style={{ width: 24, height: 24 }}
                  tintColor={
                    goalDetails.status === "ahead"
                      ? COLORS.green
                      : goalDetails.status === "on_track"
                        ? COLORS.blue
                        : COLORS.red
                  }
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: FONT_FAMILY.medium,
                    color:
                      goalDetails.status === "ahead"
                        ? COLORS.green
                        : goalDetails.status === "on_track"
                          ? COLORS.blue
                          : COLORS.red,
                  }}
                >
                  {goalDetails.status === "ahead"
                    ? "En avance"
                    : goalDetails.status === "on_track"
                      ? "Sur la bonne voie"
                      : "En retard"}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  justifyContent: "center",
                  borderWidth: 1,
                  padding: 8,
                  borderRadius: 25,
                  borderColor: COLORS.gray,
                  backgroundColor: COLORS.gray + "20",
                }}
              >
                <FontAwesome name="calendar-o" size={20} color={COLORS.gray} />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: FONT_FAMILY.medium,
                    color: COLORS.gray,
                  }}
                >
                  {formatMoney(goals.min_weekly)} CFA /{" "}
                  {goals.frequence === "weekly"
                    ? "semaine"
                    : goals.frequence === "monthly"
                      ? "mois"
                      : "jour"}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={{
              //   padding: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                padding: 12,
                borderRadius: 15,
                backgroundColor:
                  color === "#FFFFFF" ? COLORS.dark : COLORS.white,
                // justifyContent: "center",
                // alignItems: "center",
                gap: 18,
                width: "48%",
              }}
            >
              <View style={{ gap: 4 }}>
                <Text
                  style={{
                    fontFamily: FONT_FAMILY.medium,
                    fontSize: 14,
                    color: COLORS.gray,
                  }}
                >
                  DATE CIBLE
                </Text>
                <ThemedText
                  style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 16 }}
                >
                  {new Date(goals.target_date).toLocaleDateString("fr-FR", {
                    month: "long",
                    year: "numeric",
                  })}
                </ThemedText>
              </View>

              <View
                style={{ gap: 4, flexDirection: "row", alignItems: "center" }}
              >
                <Fontisto name="flag" size={17} color={COLORS.gray} />
                <Text
                  style={{
                    fontFamily: FONT_FAMILY.medium,
                    fontSize: 12,
                    color: COLORS.gray,
                  }}
                >
                  OBJECTIF INITIAL
                </Text>
              </View>
            </View>

            <View
              style={{
                padding: 12,
                borderRadius: 15,
                backgroundColor:
                  color === "#FFFFFF" ? COLORS.dark : COLORS.white,
                // justifyContent: "center",
                // alignItems: "center",
                gap: 18,
                width: "48%",
              }}
            >
              <View style={{ gap: 4 }}>
                <Text
                  style={{
                    fontFamily: FONT_FAMILY.medium,
                    fontSize: 12,
                    color: COLORS.gray,
                  }}
                >
                  PROJECTION ACTUELLE
                </Text>
                <ThemedText
                  style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 16 }}
                >
                  {new Date(goalProjections.projected_date).toLocaleDateString(
                    "fr-FR",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </ThemedText>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  justifyContent: "center",
                  borderWidth: 1,
                  padding: 8,
                  borderRadius: 25,
                  backgroundColor: COLORS.green + "20",
                  borderColor: COLORS.green,
                }}
              >
                <Text
                  style={{
                    fontFamily: FONT_FAMILY.medium,
                    fontSize: 12,
                    color: COLORS.green,
                  }}
                >
                  {goalProjections.delta_days_vs_target} jours
                </Text>
              </View>
            </View>
          </View>

          <ProgressBar
            currentProgress={calculatePercentage(
              goalDetails?.saved_amount,
              goals?.target_amount,
            )}
          />

          <View
            style={{
              padding: 12,
              borderRadius: 15,
              backgroundColor: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
              //   justifyContent: "center",
              alignItems: "center",
              gap: 18,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <View>
                <Text
                  style={{
                    fontFamily: FONT_FAMILY.semibold,
                    color: COLORS.gray,
                    fontSize: 17,
                  }}
                >
                  VITESSE D'EPARGNE
                </Text>
                <ThemedText
                  style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 22 }}
                >
                  Moy. {formatMoney(goalDetails.weeklyRate)}{" "}
                  <Text
                    style={{
                      fontFamily: FONT_FAMILY.medium,
                      fontSize: 16,
                      color: COLORS.gray,
                    }}
                  >
                    {" "}
                    CFA / sem.
                  </Text>
                </ThemedText>
              </View>
              <Ionicons name="stats-chart" size={24} color={COLORS.gray} />
            </View>

            <BarChart
              key={barData.length}
              data={barData}
              width={290}
              height={200}
              minHeight={3}
              noOfSections={4}
              spacing={25}
              barWidth={25}
              stepValue={100000}
              barStyle={{ borderRadius: 4 }}
              yAxisThickness={0}
              hideYAxisText={true}
              xAxisThickness={0}
              yAxisTextStyle={{ color: color, fontFamily: FONT_FAMILY.regular }}
              xAxisLabelTextStyle={{
                color: color,
                fontFamily: FONT_FAMILY.regular,
              }}
              showXAxisIndices={false}
              dashGap={10}
              dashWidth={0}
              frontColor={COLORS.primary}
              isAnimated
              animationDuration={500}
            />
          </View>

          <View style={{ gap: 15 }}>
            <Text
              style={{
                fontFamily: FONT_FAMILY.semibold,
                fontSize: 17,
                color: COLORS.gray,
              }}
            >
              OPTIMISATION IA
            </Text>

            <Slider data={sliderData} />
          </View>

          <View style={{ gap: 15, marginTop: 30 }}>
            <Text
              style={{
                fontFamily: FONT_FAMILY.semibold,
                fontSize: 17,
                color: COLORS.gray,
              }}
            >
              DERNIERS VERSEMENTS
            </Text>

            <View>
              <FlatList
                data={contributions}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderItem}
                ListFooterComponent={renderFooter}
                ListFooterComponentStyle={{
                  marginBottom: 30,
                }}
                scrollEnabled={false}
                contentContainerStyle={{
                  borderWidth: 1,
                  borderColor: COLORS.gray,
                  borderRadius: 12,
                  backgroundColor: COLORS.gray + "20",
                }}
              />
            </View>
          </View>
        </ScrollView>
        <View
          style={{
            padding: 12,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            backgroundColor: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
            gap: 12,
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: COLORS.green,
              padding: 15,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 12,
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
                        goal_id: id as any,
                        amount: goals?.min_weekly,
                        date: new Date().toISOString().substring(0, 10),
                        source: "manual",
                      });
                      getDatas();
                    },
                  },
                  {
                    text: "Autre montant",
                    onPress: () => {
                      setSelectedGoals(goals);
                      setInputShown("add_contribution");
                      openModal("epargneModal");
                    },
                  },
                ],
              )
            }
          >
            <FontAwesome5 name="piggy-bank" size={24} color={COLORS.white} />
            <Text
              style={{ fontFamily: FONT_FAMILY.medium, color: COLORS.white }}
            >
              Epargner
            </Text>
          </TouchableOpacity>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              style={{
                backgroundColor: COLORS.primary,
                padding: 15,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 12,
                width: "48%",
              }}
              onPress={() => {
                setInputShown("add_goal");
                openModal("epargneModal");
              }}
            >
              <AntDesign name="edit" size={24} color={COLORS.white} />
              <Text
                style={{ fontFamily: FONT_FAMILY.medium, color: COLORS.white }}
              >
                Modifier infos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: COLORS.red,
                padding: 15,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                // gap: 9,
                width: "48%",
              }}
              onPress={() =>
                Alert.alert(
                  "Suppression",
                  "Etes-vous sûr de supprimer cette épargne ?",
                  [
                    { text: "Annuler", onPress: () => {}, style: "cancel" },
                    {
                      text: "Supprimer",
                      onPress: async () => {
                        // setLoading2(true);
                        try {
                          // TODO: Implement delete function in category repository
                          await deleteGoal(id as any);
                          await getDatas();
                        } catch (error) {
                          alert(
                            "Une erreur est survenue lors de la suppression.",
                          );
                        } finally {
                          // setLoading2(false);
                        }
                      },
                      style: "destructive",
                    },
                  ],
                )
              }
            >
              <MaterialCommunityIcons
                name="delete"
                size={24}
                color={COLORS.white}
              />
              <Text
                style={{
                  fontFamily: FONT_FAMILY.medium,
                  color: COLORS.white,
                  fontSize: 12,
                }}
              >
                Supprimer l'épargne
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedView>
      {epargneModal()}
    </SafeAreaView>
  );
};

export default DetailGoal;
