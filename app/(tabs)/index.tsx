import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import { useThemeColor } from "@/hooks/use-theme-color";
import BottomSheet, { BottomSheetRefProps } from "@/src/components/BottomSheet";
import GaugeHalfCircle from "@/src/components/GaugeCard";
import SwipeableTransaction from "@/src/components/SwipeableTransaction";
import { CategoryInput, listeCategories } from "@/src/db/repositories/category";
import {
  getMonthlyExpense,
  getTotalBalance,
} from "@/src/db/repositories/financeRepo";
import {
  addRecurringPayment,
  listUpcomingRecurring,
} from "@/src/db/repositories/recurringRepo";
import {
  addTransaction,
  deleteTransaction,
  editTransaction,
  listTransactions,
  TransactionType,
} from "@/src/db/repositories/transactions";
import {
  advanceRecurring,
  insertTransactionFromRecurring,
} from "@/src/notifications/recurringHandlers";
import { getConstante, saveContante } from "@/src/services/AsyncStorage";
import { getProfile, LevelInfo } from "@/src/services/gamification/xpService";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { useModalQueue } from "@/src/ui/components/useModalQueue";
import { Feather, Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { PlatformPressable } from "@react-navigation/elements";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SelectList } from "react-native-dropdown-select-list";
import { Gesture, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const AnimatedPressable = Animated.createAnimatedComponent(PlatformPressable);

type Frequency = "semaine" | "mensuel" | "annuel" | "jour";

function toYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function prettyDate(d: string) {
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = date.getFullYear();
  return `${dd}/${mm}/${yy}`;
}
function formatMoney(v: string) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return "0";
  return Math.trunc(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const FREQUENCIES: { value: string; key: Frequency }[] = [
  { value: "Jour", key: "jour" },
  { value: "Semaine", key: "semaine" },
  { value: "Mois", key: "mensuel" },
  { value: "Année", key: "annuel" },
];

const REMIND_PRESETS = [0, 1, 2, 3, 7];

const interval = Array(999)
  .fill(0)
  .map((_, i) => i + 1);

const ACTION_WIDTH = 80;
const MAX_LEFT_SWIPE = ACTION_WIDTH * 2;
const MAX_RIGHT_SWIPE = ACTION_WIDTH;

export default function HomeScreen() {
  const [user, setUser] = useState<LevelInfo | null>(null);
  const [showBudget, setShowBudget] = useState(false);
  const color = useThemeColor({ light: "#000000", dark: "#FFFFFF" }, "text");
  const { openModal, closeModal, isVisible } = useModalQueue();
  const [loading, setLoading] = useState(false);
  const [option, setOption] = useState<TransactionType>("entree");
  const [transactionData, setTransactionData] = useState({
    amount: "0",
    category_id: 0,
    date: new Date().toISOString().substring(0, 10),
    note: "",
    recurring_id: null,
    type: option,
    id: 0,
    created_at: new Date().toISOString(),
    name: "",
    frequency: "semaine" as Frequency,
    interval_count: "1",
    next_date: new Date().toISOString().substring(0, 10),
    remind_days_before: 2,
    active: 1,
  });
  const [categories, setCategories] = useState<
    { key: number; value: string }[]
  >([]);
  const [OldCategories, setOldCategories] = useState<CategoryInput[]>([]);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date());
  const [keyReset, setKeyReset] = useState(0);
  const ref = useRef<BottomSheetRefProps>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [frequencyTransaction, setFrequencyTransaction] = useState<any[]>([]);
  const [balance, setBalance] = useState<{
    income: number;
    expense: number;
    balance: number;
  } | null>(null);
  const [budgetInfo, setBudgetInfo] = useState<{
    totalExpense: number;
    totalBudget: number;
    percentageUsed: number;
    remainingBudget: number;
  } | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const animatedValue = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const [targetValue, setTargetValue] = useState<number>(0);
  const [solde, setSolde] = useState<number>(0);
  const [loading2, setLoading2] = useState(false);
  const [selectedId, setSelectedId] = useState<number>();
  const [showSolde, setShowSolde] = useState(false);

  const OPTIONS = [
    { key: "entree", label: "Entrée" },
    { key: "depense", label: "Dépense" },
    { key: "event", label: "Charges mensuelles" },
  ];

  const options: any = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  const toggleSheet = useCallback(() => {
    const isActive = ref.current?.isActive?.();
    ref.current?.scrollTo(isActive ? SCREEN_HEIGHT : -500);
  }, []);

  const ScrollViewRef = useRef<ScrollView>(null);

  const SwipeAnimatedValue = useSharedValue(0);

  const SwipeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: SwipeAnimatedValue.value }],
    };
  });

  const toggleDatePicker = () => {
    setOpen(!open);
  };

  const onChange = ({ type }: any, selectedDate: any) => {
    if (type === "set") {
      const currentDate = selectedDate;
      setDate(currentDate);

      if (Platform.OS === "android") {
        toggleDatePicker();

        //On attribu la date à la valeur date (currentDate.toLocaleDateString('fr-FR'))
        setTransactionData({
          ...transactionData,
          date: currentDate.toISOString().substring(0, 10),
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

  const confirmIOSDate = () => {
    // console.log(date.toISOString().substring(0, 10));
    setTransactionData({
      ...transactionData,
      date: date.toISOString().substring(0, 10),
    });
    toggleDatePicker();
  };

  const getUser = async () => {
    // console.log(await getProfile());
    setUser((await getProfile()) ?? null);
  };

  const groupTransactionsByDate = (transactions: any[]) => {
    const groups = transactions.reduce((acc: any, transaction: any) => {
      const date = transaction.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(transaction);
      return acc;
    }, {});

    // On transforme l'objet en tableau pour le rendu
    // et on calcule le solde du jour (entrées - dépenses)
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => {
        const data = groups[date];
        const dayBalance = data.reduce((sum: number, t: any) => {
          if (t.type === "entree") return sum + t.amount;
          if (t.type === "depense") return sum - t.amount;
          return sum;
        }, 0);
        return { date, data, dayBalance };
      });
  };

  const getConstant = async () => {
    const res = await getConstante("show_budget");
    setShowBudget(res === "enabled");

    const cats = await listeCategories();
    setOldCategories(cats);
    setCategories(
      cats
        .filter((c) => c.type === option)
        .map((c) => ({ key: c.id, value: c.name })),
    );

    const soldeShow = await getConstante("showSolde");
    console.log(soldeShow);
    setShowSolde(soldeShow === "enabled");
  };

  const getDatas = async () => {
    const transactions = await listTransactions(10);
    console.log("Transactions:", groupTransactionsByDate(transactions));
    // console.log("Unique dates:", ...new Set(transactions.map((t) => t.date)));
    const balance = await getTotalBalance();
    animatedToValue(balance.balance);
    const budgetInfo = await getMonthlyExpense();
    console.log("Balance:", balance);
    console.log("Budget Info:", budgetInfo);
    setTransactions(groupTransactionsByDate(transactions));
    setFrequencyTransaction(await listUpcomingRecurring(10));
    console.log(
      "Transactions récurrentes à venir:",
      await listUpcomingRecurring(10),
    );
    setBalance(balance);
    setBudgetInfo(budgetInfo);
  };

  const resetData = () => {
    setTransactionData({
      amount: "0",
      category_id: 0,
      date: new Date().toISOString().substring(0, 10),
      note: "",
      recurring_id: null,
      type: option,
      id: 0,
      created_at: new Date().toISOString(),
      name: "",
      frequency: "semaine",
      interval_count: "1",
      next_date: new Date().toISOString().substring(0, 10),
      remind_days_before: 2,
      active: 1,
    });
    setOption("entree");
    setKeyReset((prev) => prev + 1);
  };

  const handleSave = async () => {
    console.log("Transaction data to save:", transactionData);
    if (
      transactionData.type !== "event" &&
      (transactionData.amount === "0" || transactionData.category_id === 0)
    ) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (
      transactionData.type === "event" &&
      (!transactionData.name ||
        !transactionData.frequency ||
        transactionData.amount === "0" ||
        transactionData.category_id === 0)
    ) {
      alert(
        "Veuillez remplir tous les champs obligatoires pour les charges mensuelles.",
      );
      return;
    }

    setLoading(true);

    try {
      let res: any;

      // Ajout transaction dans la base de données
      if (transactionData.type === "event") {
        // Enregistrer dans la table des paiements récurrents
        // console.log("Données de la charge mensuelle à enregistrer:", transactionData);
        // await addRecurringPayment(transactionData);
        res = await addRecurringPayment({
          name: transactionData.name,
          amount: parseInt(transactionData.amount),
          category_id: transactionData.category_id,
          frequency: transactionData.frequency,
          interval_count: parseInt(transactionData.interval_count),
          next_date: transactionData.date,
          remind_days_before: transactionData.remind_days_before,
          active: transactionData.active,
        });

        console.log("ID du paiement récurrent ajouté:", res);
      } else {
        // Enregistrer dans la table des transactions
        if (transactionData.id > 0) {
          res = await editTransaction({
            amount: parseInt(transactionData.amount),
            type: transactionData.type,
            category_id: transactionData.category_id,
            date: transactionData.date,
            note: transactionData.note,
            recurring_id: transactionData.recurring_id,
            id: transactionData.id,
          });
        } else {
          res = await addTransaction({
            amount: parseInt(transactionData.amount),
            type: transactionData.type,
            category_id: transactionData.category_id,
            date: transactionData.date,
            note: transactionData.note,
            recurring_id: transactionData.recurring_id,
          });
        }

        console.log("ID de la transaction ajoutée:", res);
      }

      if (parseInt(res) > 0) {
        resetData();
        getDatas(); // Rafraîchir la liste des transactions
        toggleSheet();
      }
    } catch (error) {
      alert(
        "Une erreur est survenue lors de l'enregistrement de la transaction.",
      );
      console.error("Error saving transaction:", error);
    } finally {
      resetData();
      setLoading(false);
    }
  };

  const handleDelete = async (id: any) => {
    Alert.alert(
      "Suppression",
      "Voulez-vous vraiment supprimer cette transaction ?",
      [
        {
          text: "Oui",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTransaction(id);
              alert("Supprimé avec succès");
              getDatas();
            } catch (error) {
              alert("Erreur de suppression");
              console.error("Erreur de suppression de transaction ", error);
            }
          },
        },
        { text: "Non", style: "cancel" },
      ],
    );
  };

  const handleEdit = async (trans: any) => {
    setCategories(
      OldCategories.filter((c) => c.type === trans.type).map((c) => ({
        key: c.id,
        value: c.name,
      })),
    );
    setOption(trans.type);
    setTransactionData({
      amount: trans.amount.toString(),
      category_id: trans.category_id,
      created_at: trans.created_at,
      date: trans.date,
      note: trans.note,
      type: trans.type,
      recurring_id: null,
      id: trans.id,
      name: "",
      frequency: "semaine",
      interval_count: "1",
      next_date: new Date().toISOString().substring(0, 10),
      remind_days_before: 2,
      active: 1,
    });
    setKeyReset((prev) => prev + 1);
    toggleSheet();
  };

  const handleTypeChange = (type: TransactionType) => {
    type === "event"
      ? ref.current?.scrollTo(-700)
      : ref.current?.scrollTo(-500);
    setKeyReset((prev) => prev + 1);
    setTransactionData({ ...transactionData, type: type, category_id: 0 });
    setOption(type);
    setCategories(
      OldCategories.filter((c) => c.type === type).map((c) => ({
        key: c.id,
        value: c.name,
      })),
    );
  };

  const animatedToValue = (newValue: number) => {
    scale.value = withTiming(1.2, { duration: 100 }, () => {
      scale.value = withSpring(1, { damping: 100 });
    });
    opacity.value = withTiming(1.2, { duration: 100 }, () => {
      opacity.value = withTiming(1, { duration: 200 });
    });

    animatedValue.value = withTiming(newValue, { duration: 1500 });
    // RNAnimated.sequence([
    //   RNAnimated.parallel([
    //     RNAnimated.timing(scale, {
    //       toValue: 0.2,
    //       duration: 100,
    //       useNativeDriver: true,
    //     }),
    //     RNAnimated.timing(opacity, {
    //       toValue: 0.7,
    //       duration: 100,
    //       useNativeDriver: true,
    //     }),
    //   ]),
    //   RNAnimated.parallel([
    //     RNAnimated.spring(scale, {
    //       toValue: 1,
    //       friction: 3,
    //       useNativeDriver: true,
    //     }),
    //     RNAnimated.timing(opacity, {
    //       toValue: 1,
    //       duration: 200,
    //       useNativeDriver: true,
    //     }),
    //     RNAnimated.timing(animatedValue, {
    //       toValue: newValue,
    //       duration: 1500,
    //       easing: Easing.out(Easing.exp),
    //       useNativeDriver: false,
    //     }),
    //   ]),
    // ]).start();
    // setTargetValue(newValue);
  };

  useDerivedValue(() => {
    runOnJS(setSolde)(animatedValue.value);
  }, [animatedValue]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const toggleSwitch = () =>
    setTransactionData({
      ...transactionData,
      active: transactionData.active === 1 ? 0 : 1,
    });

  const manualPay = async (id: number) => {
    setSelectedId(id);
    setLoading2(true);

    try {
      const saved = await insertTransactionFromRecurring(
        id,
        toYYYYMMDD(new Date()),
      );
      if (saved) await advanceRecurring(saved);

      getDatas();
    } catch (error) {
      alert("Erreur de paiement");
      console.error("Erreur de paiement ", error);
    } finally {
      setLoading2(false);
    }

    // setTimeout(() => {
    //   setLoading2(false);
    // }, 5000);
  };

  const toggleShowSolde = async () => {
    const newValue = !showSolde;
    setShowSolde(newValue);
    const setting = newValue ? "enabled" : "disabled";
    await saveContante("showSolde", JSON.stringify(setting));
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {})
    .onUpdate((event) => {
      SwipeAnimatedValue.value = Math.min(
        MAX_RIGHT_SWIPE,
        Math.max(-MAX_LEFT_SWIPE, event.translationX),
      );
    })
    .onEnd(() => {});

  useFocusEffect(
    useCallback(() => {
      getUser();
      getConstant();
      getDatas();
    }, []),
  );

  return (
    <GestureHandlerRootView>
      <SafeAreaView style={{ flex: 1 }}>
        <ThemedView lightColor={COLORS.secondary}>
          <ScrollView
            contentContainerStyle={{
              gap: 22,
              flexDirection: "column",
              padding: 10,
              paddingBottom: 100,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={() => [getConstant(), getDatas()]}
              />
            }
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <ThemedText
                style={{
                  fontFamily: FONT_FAMILY.bold,
                  fontSize: 35,
                  color: COLORS.primary,
                }}
              >
                S
                <ThemedText
                  style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 22 }}
                >
                  ika
                </ThemedText>
              </ThemedText>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <ThemedText
                  style={{ fontFamily: FONT_FAMILY.regular, fontSize: 14 }}
                >
                  Bienvenue, {user?.name}
                </ThemedText>
                <Image
                  source={
                    user?.gender === "male"
                      ? require("../../assets/images/boy.png")
                      : require("../../assets/images/woman.png")
                  }
                  style={{ width: 40, height: 40 }}
                />
              </View>
            </View>

            {/* Card */}
            <View
              style={{
                backgroundColor:
                  color === "#FFFFFF" ? COLORS.white : COLORS.dark,
                borderRadius: 10,
                padding: 15,
                marginTop: 20,
                gap: 8,
              }}
            >
              <ThemedText
                style={{
                  fontFamily: FONT_FAMILY.semibold,
                  color: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
                }}
              >
                Solde Total
              </ThemedText>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {showSolde ? (
                  <Animated.Text
                    style={[
                      {
                        fontFamily: FONT_FAMILY.bold,
                        color: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
                        fontSize: 32,
                      },
                      animatedStyle,
                    ]}
                  >
                    {`${solde.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`}
                  </Animated.Text>
                ) : (
                  <Text
                    style={{
                      fontFamily: FONT_FAMILY.bold,
                      color: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
                      fontSize: 32,
                    }}
                  >
                    *************
                  </Text>
                )}

                <TouchableOpacity onPress={toggleShowSolde}>
                  {showSolde ? (
                    <Feather name="eye" size={24} color="black" />
                  ) : (
                    <Feather name="eye-off" size={24} color="black" />
                  )}
                </TouchableOpacity>
              </View>
              <ThemedText
                style={{
                  fontFamily: FONT_FAMILY.regular,
                  color: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
                  marginTop: 8,
                }}
              >
                Budget mensuel
              </ThemedText>
              <View>
                <View
                  style={{
                    backgroundColor: COLORS.secondary,
                    height: 10,
                    borderRadius: 5,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: budgetInfo
                        ? budgetInfo.percentageUsed >= 70
                          ? COLORS.red
                          : budgetInfo.percentageUsed >= 50
                            ? COLORS.orange
                            : COLORS.primary
                        : COLORS.primary,
                      height: 10,
                      width: budgetInfo
                        ? `${budgetInfo.percentageUsed}%`
                        : "0%",
                    }}
                  />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <ThemedText
                    style={{
                      fontFamily: FONT_FAMILY.regular,
                      marginTop: 4,
                      color: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
                      fontSize: 12,
                    }}
                  >
                    Depensé :{" "}
                    <Text style={{ fontFamily: FONT_FAMILY.semibold }}>
                      {budgetInfo
                        ? `${budgetInfo.totalExpense.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`
                        : "Loading..."}{" "}
                    </Text>
                    /{" "}
                    {budgetInfo
                      ? `${budgetInfo.totalBudget.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`
                      : "Loading..."}
                  </ThemedText>

                  <Text
                    style={{
                      color: COLORS.primary,
                      fontFamily: FONT_FAMILY.semibold,
                      fontSize: 12,
                    }}
                  >
                    {budgetInfo
                      ? `${budgetInfo.percentageUsed.toFixed(0)}%`
                      : "Loading..."}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor:
                    color === "#FFFFFF" ? COLORS.dark : COLORS.white,
                  padding: 12,
                  borderRadius: 16,
                  alignItems: "center",
                  marginTop: 10,
                }}
                onPress={() => toggleSheet()}
              >
                <Text
                  style={{
                    fontFamily: FONT_FAMILY.semibold,
                    color: color === "#FFFFFF" ? COLORS.white : COLORS.dark,
                  }}
                >
                  Nouvelle transaction
                </Text>
              </TouchableOpacity>
            </View>
            {/* Fin card */}

            {/* Bouton Clôture du mois */}
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginHorizontal: 20,
                marginTop: 16,
                paddingVertical: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: COLORS.primary + "40",
              }}
              onPress={() => router.navigate("/(screens)/ClotureMois")}
            >
              <Feather name="lock" size={18} color={COLORS.primary} />
              <Text
                style={{
                  fontFamily: FONT_FAMILY.semibold,
                  fontSize: 14,
                  color: COLORS.primary,
                }}
              >
                Clôture du mois
              </Text>
            </TouchableOpacity>
            {/* Fin Bouton Clôture */}

            {/* Payement à venir */}
            <View style={{ gap: 8, marginTop: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <ThemedText
                  style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 20 }}
                >
                  Paiement à venir
                </ThemedText>
                <TouchableOpacity
                  onPress={() => router.navigate("/(screens)/IncomingEvent")}
                >
                  <ThemedText style={{ fontFamily: FONT_FAMILY.regular }}>
                    Voir plus
                  </ThemedText>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ gap: 12, marginTop: 10 }}
                contentContainerStyle={{ gap: 13 }}
              >
                {frequencyTransaction.length === 0 ? (
                  <View>
                    <ThemedText
                      style={{
                        textAlign: "center",
                        marginTop: 50,
                        color: "#808080",
                        fontFamily: FONT_FAMILY.medium,
                      }}
                    >
                      Aucune transaction récurrente.
                    </ThemedText>
                  </View>
                ) : (
                  <>
                    {frequencyTransaction.map((t: any) => (
                      <TouchableOpacity
                        key={t.id}
                        style={{
                          borderRadius: 16,
                          overflow: "hidden",
                          padding: 10,
                          backgroundColor:
                            color === "#FFFFFF" ? COLORS.noir : COLORS.white,
                          gap: 8,
                          width: 200,
                        }}
                        onPress={() =>
                          router.push({
                            pathname: "/(screens)/DetailEvent",
                            params: {
                              id: t.id,
                              name: t.name,
                              amount: t.amount.toString(),
                              category_id: t.category_id,
                              category_name:
                                OldCategories.find(
                                  (c) => c.id === t.category_id,
                                )?.name || "Aucune",
                              frequency: t.frequency,
                              interval_count: t.interval_count.toString(),
                              next_date: t.next_date,
                              remind_days_before: t.remind_days_before,
                              active: t.active,
                              daysLate: t.daysLate,
                            },
                          })
                        }
                      >
                        <Image
                          source={
                            t.name.toLowerCase().includes("netflix")
                              ? require("../../assets/images/netflix.png")
                              : t.name.toLowerCase().includes("loyer")
                                ? require("../../assets/images/3d-house.png")
                                : t.name.toLowerCase().includes("amazon")
                                  ? require("../../assets/images/amazon.png")
                                  : t.name.toLowerCase().includes("facture")
                                    ? require("../../assets/images/bill.png")
                                    : t.name.toLowerCase().includes("canca")
                                      ? require("../../assets/images/canva.jpg")
                                      : t.name.toLowerCase().includes("chatgpt")
                                        ? require("../../assets/images/chatgpt.png")
                                        : t.name
                                              .toLowerCase()
                                              .includes("facebook")
                                          ? require("../../assets/images/facebook.png")
                                          : t.name
                                                .toLowerCase()
                                                .includes("gemini")
                                            ? require("../../assets/images/gemini.jpg")
                                            : t.name
                                                  .toLowerCase()
                                                  .includes("spotify")
                                              ? require("../../assets/images/spotify.png")
                                              : t.name
                                                    .toLowerCase()
                                                    .includes("instagram")
                                                ? require("../../assets/images/instagram.png")
                                                : t.name
                                                      .toLowerCase()
                                                      .includes("prime")
                                                  ? require("../../assets/images/prime.png")
                                                  : t.name
                                                        .toLowerCase()
                                                        .includes("tiktok")
                                                    ? require("../../assets/images/tiktok.png")
                                                    : t.name
                                                          .toLowerCase()
                                                          .includes("upwork")
                                                      ? require("../../assets/images/upwork.png")
                                                      : t.name
                                                            .toLowerCase()
                                                            .includes("youtube")
                                                        ? require("../../assets/images/youtube.png")
                                                        : require("../../assets/images/schedule.png")
                          }
                          style={{ width: 70, height: 70, borderRadius: 16 }}
                        />
                        <ThemedText style={{ fontFamily: "SemiBold" }}>
                          {t.name}
                        </ThemedText>
                        <ThemedText
                          style={{ fontFamily: "Regular", fontSize: 12 }}
                        >
                          {new Date(t.next_date).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                          })}
                        </ThemedText>
                        <ThemedText style={{ fontFamily: "Bold" }}>
                          {formatMoney(t.amount)} FCFA
                        </ThemedText>
                        <TouchableOpacity
                          style={{
                            backgroundColor:
                              color === "#FFFFFF"
                                ? COLORS.secondary
                                : COLORS.dark,
                            padding: 12,
                            borderRadius: 15,
                            justifyContent: "center",
                            alignItems: "center",
                            opacity: loading2 ? 0.7 : 1,
                            flexDirection: "row",
                            gap: 6,
                          }}
                          onPress={async () => manualPay(t.id)}
                          disabled={loading2}
                        >
                          {loading2 && selectedId === t.id ? (
                            <ActivityIndicator
                              color={
                                color === "#FFFFFF" ? COLORS.dark : COLORS.white
                              }
                            />
                          ) : (
                            <Text
                              style={{
                                fontFamily: FONT_FAMILY.bold,
                                color:
                                  color === "#FFFFFF"
                                    ? COLORS.dark
                                    : COLORS.white,
                                fontSize: 13,
                              }}
                            >
                              Payer maintenant{" "}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </ScrollView>
            </View>
            {/* Fin Payement à venir */}

            {/* Liste des transactions */}
            <View style={{ gap: 8, marginTop: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <ThemedText
                  style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 20 }}
                >
                  Reçentes transactions
                </ThemedText>
                <TouchableOpacity
                  onPress={() =>
                    router.navigate("/(screens)/ListeTransactions")
                  }
                >
                  <ThemedText style={{ fontFamily: FONT_FAMILY.regular }}>
                    Voir plus
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {transactions && transactions.length > 0 && (
                <FlatList
                  data={transactions}
                  keyExtractor={(item) => item.date}
                  renderItem={({ item }) => (
                    <View style={{ marginBottom: 20 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 10,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: FONT_FAMILY.medium,
                            fontSize: 16,
                            color: "#888",
                          }}
                        >
                          {item.date === new Date().toISOString().split("T")[0]
                            ? "Aujourd'hui"
                            : new Date(item.date).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "long",
                              })}
                        </Text>
                        <Text
                          style={{
                            fontFamily: FONT_FAMILY.semibold,
                            fontSize: 14,
                            color:
                              item.dayBalance > 0
                                ? "#34C759"
                                : item.dayBalance < 0
                                  ? "#FF3B30"
                                  : "#888",
                          }}
                        >
                          {item.dayBalance > 0 ? "+" : ""}
                          {formatMoney(String(item.dayBalance))} FCFA
                        </Text>
                      </View>

                      {item.data.map((trans: any) => (
                        <SwipeableTransaction
                          key={trans.id}
                          trans={trans}
                          onPress={(id: any) => handleDelete(id)}
                          onPressEdit={(id: any) => handleEdit(id)}
                        />
                        // <GestureDetector key={trans.id} gesture={panGesture}>
                        //   <Animated.View style={SwipeAnimatedStyle}>
                        //     <TouchableOpacity
                        //       key={trans.id}
                        //       style={{
                        //         flexDirection: "row",
                        //         justifyContent: "space-around",
                        //         alignItems: "center",
                        //         backgroundColor:
                        //           color === "#FFFFFF"
                        //             ? COLORS.dark
                        //             : COLORS.secondary,
                        //         padding: 10,
                        //         borderRadius: 8,
                        //         marginBottom: 8,
                        //       }}
                        //       onPress={
                        //         () =>
                        //           router.push({
                        //             pathname: "/(screens)/DetailTransactions",
                        //             params: {
                        //               id: trans.id,
                        //               amount: trans.amount,
                        //               note: trans.note,
                        //               date: trans.date,
                        //               name: trans.category_name,
                        //               type: trans.type,
                        //               created_at: trans.created_at,
                        //             },
                        //           })
                        //         // console.log("Transaction details on press:", trans)
                        //       }
                        //       onLongPress={() =>
                        //         Alert.alert(
                        //           "Suppression",
                        //           "Voulez-vous vraiment supprimer cette transaction ?",
                        //           [
                        //             {
                        //               text: "Oui",
                        //               // onPress: () => handleDelete(trans.id),
                        //               style: "destructive",
                        //             },
                        //             { text: "Non", style: "cancel" },
                        //           ],
                        //         )
                        //       }
                        //     >
                        //       <View
                        //         style={{
                        //           backgroundColor:
                        //             color === "#FFFFFF"
                        //               ? COLORS.secondary
                        //               : COLORS.dark,
                        //           padding: 15,
                        //           borderRadius: 8,
                        //           flexDirection: "row",
                        //           alignItems: "center",
                        //           gap: 15,
                        //           width: 50,
                        //           justifyContent: "center",
                        //           height: 50,
                        //         }}
                        //       >
                        //         <Image
                        //           source={
                        //             trans.category_name
                        //               ?.toLowerCase()
                        //               .includes("alimentation")
                        //               ? require("../../assets/images/diet.png")
                        //               : trans.category_name
                        //                     ?.toLowerCase()
                        //                     .includes("transport")
                        //                 ? require("../../assets/images/transportation.png")
                        //                 : trans.category_name
                        //                       ?.toLowerCase()
                        //                       .includes("facture")
                        //                   ? require("../../assets/images/bill.png")
                        //                   : trans.category_name
                        //                         ?.toLowerCase()
                        //                         .includes("abonnement")
                        //                     ? require("../../assets/images/membership.png")
                        //                     : trans.category_name
                        //                           ?.toLowerCase()
                        //                           .includes("sante")
                        //                       ? require("../../assets/images/pills.png")
                        //                       : trans.category_name
                        //                             ?.toLowerCase()
                        //                             .includes("loisirs")
                        //                         ? require("../../assets/images/theater.png")
                        //                         : trans.category_name
                        //                               ?.toLowerCase()
                        //                               .includes("salaire")
                        //                           ? require("../../assets/images/payroll.png")
                        //                           : trans.category_name
                        //                                 ?.toLowerCase()
                        //                                 .includes("depart")
                        //                             ? require("../../assets/images/salary.png")
                        //                             : trans.category_name
                        //                                   ?.toLowerCase()
                        //                                   .includes("mission")
                        //                               ? require("../../assets/images/mission.png")
                        //                               : trans.category_name
                        //                                     ?.toLowerCase()
                        //                                     .includes("famille")
                        //                                 ? require("../../assets/images/big-family.png")
                        //                                 : trans.category_name
                        //                                       ?.toLowerCase()
                        //                                       .includes(
                        //                                         "education",
                        //                                       )
                        //                                   ? require("../../assets/images/stack-of-books.png")
                        //                                   : trans.category_name
                        //                                         ?.toLowerCase()
                        //                                         .includes(
                        //                                           "shopping",
                        //                                         )
                        //                                     ? require("../../assets/images/online-shopping.png")
                        //                                     : trans.category_name
                        //                                           ?.toLowerCase()
                        //                                           .includes(
                        //                                             "téléphone/internet",
                        //                                           )
                        //                                       ? require("../../assets/images/iphone.png")
                        //                                       : trans.category_name
                        //                                             ?.toLowerCase()
                        //                                             .includes(
                        //                                               "soin",
                        //                                             )
                        //                                         ? require("../../assets/images/lotions.png")
                        //                                         : require("../../assets/images/shapes.png")
                        //           }
                        //           // tintColor={
                        //           //   color === "#FFFFFF" ? COLORS.white : COLORS.dark
                        //           // }
                        //           style={{ width: 30, height: 30 }}
                        //         />
                        //       </View>

                        //       <View style={{ width: 170, gap: 4 }}>
                        //         <ThemedText
                        //           style={{
                        //             fontSize: 14,
                        //             fontFamily: FONT_FAMILY.semibold,
                        //           }}
                        //           ellipsizeMode="tail"
                        //           numberOfLines={1}
                        //         >
                        //           {trans.note}
                        //         </ThemedText>
                        //         <ThemedText
                        //           style={{
                        //             fontSize: 12,
                        //             fontFamily: FONT_FAMILY.medium,
                        //           }}
                        //         >
                        //           {trans.created_at.split(" ")[1]} ●{" "}
                        //           {trans.category_name}
                        //         </ThemedText>
                        //       </View>

                        //       <ThemedText
                        //         style={{
                        //           fontSize: 14,
                        //           fontFamily: FONT_FAMILY.semibold,
                        //           // color:
                        //           //   color === "#FFFFFF" ? COLORS.dark : COLORS.white,
                        //         }}
                        //       >
                        //         {formatMoney(trans.amount)} CFA
                        //       </ThemedText>
                        //     </TouchableOpacity>
                        //   </Animated.View>
                        // </GestureDetector>
                      ))}
                    </View>
                  )}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                  // contentContainerStyle={{ flex: 1 }}
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
                        style={{
                          fontFamily: FONT_FAMILY.semibold,
                          fontSize: 17,
                        }}
                      >
                        Aucune transaction
                      </ThemedText>
                    </View>
                  )}
                />
              )}
            </View>
            {/* Fin Liste des transactions */}

            {/* Mes xp */}
            <View>
              <GaugeHalfCircle
                value={user?.xpIntoLevel ?? 0}
                level={user?.level ?? 1}
                max={user?.xpForNextLevel ?? 100}
              />
            </View>
          </ScrollView>
        </ThemedView>

        <BottomSheet ref={ref}>
          <ScrollView
            ref={ScrollViewRef}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={true}
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
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                backgroundColor: COLORS.secondary,
                // padding: 10,
                borderRadius: 50,
                alignItems: "center",
              }}
            >
              {OPTIONS.map((opt: any) => (
                <AnimatedPressable
                  layout={LinearTransition.springify().mass(0.5)}
                  key={opt.key}
                  style={{
                    alignItems: "center",
                    padding: 12,
                    borderRadius: 25,
                    backgroundColor:
                      option === opt.key ? COLORS.dark : "transparent",
                  }}
                  onPress={() => handleTypeChange(opt.key)}
                >
                  <Animated.Text
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(200)}
                    style={{
                      fontFamily:
                        option === opt.key
                          ? FONT_FAMILY.semibold
                          : FONT_FAMILY.regular,
                      color: option === opt.key ? COLORS.white : COLORS.dark,
                    }}
                  >
                    {opt.label}
                  </Animated.Text>
                </AnimatedPressable>
              ))}
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
                placeholderTextColor={color}
                onChangeText={(e) =>
                  setTransactionData({
                    ...transactionData,
                    amount: e,
                  })
                }
                value={transactionData.amount}
              />
            </View>

            {transactionData.type !== "event" && (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    // width: "100%",
                    justifyContent: "center",
                    gap: 12,
                  }}
                >
                  <SelectList
                    data={categories}
                    key={keyReset}
                    setSelected={(val: string) =>
                      setTransactionData({
                        ...transactionData,
                        category_id: parseInt(val),
                      })
                    }
                    placeholder="Choisir une catégorie"
                    inputStyles={{
                      color: color,
                      fontFamily: FONT_FAMILY.regular,
                    }}
                    searchPlaceholder="Entrez une catégorie"
                    dropdownTextStyles={{
                      color: color,
                      fontFamily: FONT_FAMILY.regular,
                    }}
                    closeicon={
                      <Ionicons name="close" size={18} color={color} />
                    }
                    searchicon={
                      <Ionicons name="search" size={18} color={color} />
                    }
                    arrowicon={
                      <Feather name="chevron-down" size={24} color={color} />
                    }
                    save="key"
                    defaultOption={{
                      key: transactionData.category_id,
                      value:
                        categories.find(
                          (c) => c.key === transactionData.category_id,
                        )?.value || "",
                    }}
                  />

                  <View
                    style={
                      {
                        // flexDirection: "row",
                        // alignItems: "center",
                        // width: "70%",
                        // justifyContent: "space-between",
                      }
                    }
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
                          placeholder="Date debut"
                          placeholderTextColor="#000"
                          style={{
                            borderWidth: 1,
                            borderColor: "gray",
                            padding: 10,
                            borderRadius: 10,
                            color: color,
                            height: 52,
                            width: 145,
                          }}
                          editable={false}
                          value={transactionData.date}
                          onChangeText={(e: any) =>
                            setTransactionData({
                              ...transactionData,
                              date: e,
                            })
                          }
                          onPressIn={toggleDatePicker}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View>
                  <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                    Note
                  </ThemedText>
                  <TextInput
                    multiline
                    placeholder="Ajouter une note"
                    placeholderTextColor={color}
                    style={{
                      borderWidth: 1,
                      borderColor: "gray",
                      padding: 13,
                      borderRadius: 10,
                      color: color,
                      marginTop: 8,
                      textAlignVertical: "top",
                      height: 100,
                      fontFamily: FONT_FAMILY.regular,
                    }}
                    value={transactionData.note}
                    onChangeText={(e) =>
                      setTransactionData({ ...transactionData, note: e })
                    }
                  />
                </View>
              </>
            )}

            {transactionData.type === "event" && (
              <>
                <View>
                  <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                    Nom ou description de la charge
                  </ThemedText>
                  <TextInput
                    placeholder="Ex: Loyer, électricité..."
                    placeholderTextColor={
                      color === "#FFFFFF" ? COLORS.gray : COLORS.dark
                    }
                    style={{
                      borderWidth: 1,
                      borderColor: "gray",
                      padding: 13,
                      borderRadius: 10,
                      color: color,
                      marginTop: 8,
                      textAlignVertical: "top",
                      fontFamily: FONT_FAMILY.regular,
                    }}
                    value={transactionData.name}
                    onChangeText={(e) =>
                      setTransactionData({ ...transactionData, name: e })
                    }
                  />
                </View>
                <View style={{ gap: 8 }}>
                  <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                    Catégorie
                  </ThemedText>
                  <SelectList
                    data={categories}
                    key={keyReset}
                    setSelected={(val: string) =>
                      setTransactionData({
                        ...transactionData,
                        category_id: parseInt(val),
                      })
                    }
                    placeholder="Choisir une catégorie"
                    inputStyles={{ color: color }}
                    searchPlaceholder="Entrez une catégorie"
                    dropdownTextStyles={{ color: color }}
                    closeicon={
                      <Ionicons name="close" size={18} color={color} />
                    }
                    searchicon={
                      <Ionicons name="search" size={18} color={color} />
                    }
                    arrowicon={
                      <Feather name="chevron-down" size={24} color={color} />
                    }
                    save="key"
                  />
                </View>
                <View style={{ gap: 8 }}>
                  <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                    Fréquence (chaque :)
                  </ThemedText>
                  <View
                    style={{
                      flexDirection: "row",
                      // gap: 12,
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <TextInput
                      keyboardType="numeric"
                      placeholder="1"
                      placeholderTextColor={color}
                      style={{
                        borderWidth: 1,
                        borderColor: "gray",
                        padding: 13,
                        borderRadius: 10,
                        color: color,
                        width: 60,
                        textAlign: "center",
                        fontFamily: FONT_FAMILY.regular,
                      }}
                      maxLength={3}
                      onChangeText={(e) =>
                        setTransactionData({
                          ...transactionData,
                          interval_count: e,
                        })
                      }
                      value={transactionData.interval_count.toString()}
                    />

                    <SelectList
                      data={FREQUENCIES.map((f) => ({
                        key: f.key,
                        value: f.value,
                      }))}
                      key={keyReset}
                      setSelected={(val: string) =>
                        setTransactionData({
                          ...transactionData,
                          frequency: val as Frequency,
                        })
                      }
                      placeholder="Choisir une fréquence"
                      inputStyles={{
                        color: color,
                        width: "90%",
                        fontFamily: FONT_FAMILY.regular,
                      }}
                      boxStyles={{
                        width: "80%",
                      }}
                      searchPlaceholder="Entrez une fréquence"
                      dropdownTextStyles={{
                        color: color,
                        fontFamily: FONT_FAMILY.regular,
                      }}
                      closeicon={
                        <Ionicons name="close" size={18} color={color} />
                      }
                      searchicon={
                        <Ionicons name="search" size={18} color={color} />
                      }
                      arrowicon={
                        <Feather name="chevron-down" size={24} color={color} />
                      }
                      save="key"
                    />
                  </View>
                </View>
                <View style={{ gap: 8 }}>
                  <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                    Date de paiement
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
                          placeholder="Date debut"
                          placeholderTextColor="#000"
                          style={{
                            borderWidth: 1,
                            borderColor: "gray",
                            padding: 10,
                            borderRadius: 10,
                            color: color,
                            fontFamily: FONT_FAMILY.regular,
                            height: 52,
                            width: "100%",
                          }}
                          editable={false}
                          value={transactionData.date}
                          onChangeText={(e: any) =>
                            setTransactionData({
                              ...transactionData,
                              date: e,
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
                    Rappel
                  </ThemedText>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 12 }}
                  >
                    {REMIND_PRESETS.map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        style={{
                          padding: 10,
                          backgroundColor:
                            transactionData.remind_days_before === preset
                              ? COLORS.primary
                              : COLORS.secondary,
                          borderRadius: 10,
                        }}
                        onPress={() =>
                          setTransactionData({
                            ...transactionData,
                            remind_days_before: preset,
                          })
                        }
                      >
                        <ThemedText
                          style={{
                            color:
                              transactionData.remind_days_before === preset
                                ? COLORS.white
                                : COLORS.noir,
                            fontFamily: FONT_FAMILY.regular,
                          }}
                        >
                          {preset === 0 ? "Jour J" : `J-${preset}`}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View
                  style={{
                    gap: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                    Actif
                  </ThemedText>
                  <Switch
                    trackColor={{ false: COLORS.gray, true: COLORS.gray }}
                    thumbColor={
                      transactionData.active ? COLORS.green : COLORS.secondary
                    }
                    style={{ transform: [{ scaleX: 1 }, { scaleY: 1 }] }}
                    onValueChange={toggleSwitch}
                    value={transactionData.active === 1}
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={{
                padding: 15,
                alignItems: "center",
                backgroundColor: COLORS.primary,
                borderRadius: 25,
                opacity: loading ? 0.7 : 1,
              }}
              onPress={handleSave}
              disabled={loading}
            >
              <Text
                style={{
                  color: COLORS.white,
                  fontFamily: FONT_FAMILY.bold,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Enregistrer la transaction
                {loading && <ActivityIndicator color={COLORS.white} />}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </BottomSheet>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
