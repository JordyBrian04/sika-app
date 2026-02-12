import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import { useThemeColor } from "@/hooks/use-theme-color";
import BottomSheet, { BottomSheetRefProps } from "@/src/components/BottomSheet";
import GaugeHalfCircle from "@/src/components/GaugeCard";
import { CategoryInput, listeCategories } from "@/src/db/repositories/category";
import {
  addTransaction,
  TransactionType,
} from "@/src/db/repositories/transactions";
import { getConstante } from "@/src/services/AsyncStorage";
import { getProfile, LevelInfo } from "@/src/services/gamification/xpService";
import { useModalQueue } from "@/src/ui/components/useModalQueue";
import { Feather, Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { PlatformPressable } from "@react-navigation/elements";
import { useFonts } from "expo-font";
import { useFocusEffect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SelectList } from "react-native-dropdown-select-list";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
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
function prettyDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
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

export default function HomeScreen() {
  const [user, setUser] = useState<LevelInfo | null>(null);
  const [showBudget, setShowBudget] = useState(false);
  const color = useThemeColor({ light: "#000000", dark: "#FFFFFF" }, "text");
  const { openModal, closeModal, isVisible } = useModalQueue();
  const [loading, setLoading] = useState(false);
  const [option, setOption] = useState<TransactionType>("entree");
  // console.log(interval);
  // const [frequence, setOption] = useState<TransactionType>("entree");
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
  const [openSheet, setOpenSheet] = useState(false);

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

  // const openLow = () => ref.current?.scrollTo("low");
  // const openMid = () => ref.current?.scrollTo("mid");
  // const openHigh = () => ref.current?.scrollTo("high");
  // const closeSheet = () => ref.current?.scrollTo("closed");

  // const showModal = useCallback(async () => {
  //   setOpenSheet(true);
  //   ref.current?.scrollTo("high");
  // }, []);

  // const hideModal = useCallback(async () => {
  //   setOpenSheet(false);
  //   ref.current?.scrollTo("closed");
  // }, []);

  const toggleSheet = useCallback(() => {
    const isActive = ref.current?.isActive?.();
    ref.current?.scrollTo(isActive ? SCREEN_HEIGHT : -500);
  }, []);

  const ScrollViewRef = useRef<ScrollView>(null);

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
    // console.log(
    //   "Categories:",
    //   cats
    //     .filter((c) => c.type === option)
    //     .map((c) => ({ key: c.id, value: c.name })),
    // );
  };

  useFocusEffect(
    useCallback(() => {
      getUser();
      getConstant();
    }, []),
  );

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
    setKeyReset((prev) => prev + 1);
  };

  const handleSave = async () => {
    console.log("Transaction data to save:", transactionData);
    if (
      transactionData.type !== "event" &&
      (!transactionData.amount || transactionData.category_id === 0)
    ) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (
      transactionData.type === "event" &&
      (!transactionData.name ||
        !transactionData.frequency ||
        !transactionData.amount ||
        transactionData.category_id === 0 ||
        transactionData.next_date === new Date().toISOString().substring(0, 10))
    ) {
      alert(
        "Veuillez remplir tous les champs obligatoires pour les charges mensuelles.",
      );
      return;
    }

    setLoading(true);

    try {
      // Ajout transaction dans la base de données
      if (transactionData.type === "event") {
        // Enregistrer dans la table des paiements récurrents
        // console.log("Données de la charge mensuelle à enregistrer:", transactionData);
        // await addRecurringPayment(transactionData);
      } else {
        // Enregistrer dans la table des transactions
        await addTransaction({
          amount: parseInt(transactionData.amount),
          type: transactionData.type,
          category_id: transactionData.category_id,
          date: transactionData.date,
          note: transactionData.note,
          recurring_id: transactionData.recurring_id,
        });
      }

      resetData();
      closeModal();
    } catch (error) {
      alert(
        "Une erreur est survenue lors de l'enregistrement de la transaction.",
      );
      console.error("Error saving transaction:", error);
    } finally {
      setLoading(false);
    }
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

  function transactionModal() {
    return (
      <Modal
        visible={isVisible("transactionModal")}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={{
            flex: 1,
            maxHeight: 600,
            position: "absolute",
            bottom: 0,
            width: "100%",
            zIndex: 999999,
          }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          >
            <View
              style={{
                borderTopEndRadius: 24,
                borderTopStartRadius: 24,
                position: "absolute",
                bottom: 0,
                // padding: 20,
                // width: "100%",
                // gap: 22,
                // paddingBottom: Platform.OS === "ios" ? 40 : 20, // Ajustement dynamique
                maxHeight: SCREEN_HEIGHT * 0.9,
                backgroundColor:
                  color === "#FFFFFF" ? COLORS.dark : COLORS.white,
              }}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={{
                  padding: 20,
                  gap: 22,
                  paddingBottom: Platform.OS === "ios" ? 60 : 30,
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
                            option === opt.key ? "SemiBold" : "Regular",
                          color:
                            option === opt.key ? COLORS.white : COLORS.dark,
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
                  <ThemedText style={{ fontFamily: "Regular" }}>
                    Montant (CFA)
                  </ThemedText>
                  <TextInput
                    placeholder="0"
                    keyboardType="numeric"
                    style={{
                      fontFamily: "Bold",
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
                          <Feather
                            name="chevron-down"
                            size={24}
                            color={color}
                          />
                        }
                        save="key"
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
                      <ThemedText style={{ fontFamily: "SemiBold" }}>
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
                          fontFamily: "Regular",
                        }}
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
                      <ThemedText style={{ fontFamily: "SemiBold" }}>
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
                          fontFamily: "Regular",
                        }}
                        value={transactionData.name}
                        onChangeText={(e) =>
                          setTransactionData({ ...transactionData, name: e })
                        }
                      />
                    </View>
                    <View style={{ gap: 8 }}>
                      <ThemedText style={{ fontFamily: "SemiBold" }}>
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
                          <Feather
                            name="chevron-down"
                            size={24}
                            color={color}
                          />
                        }
                        save="key"
                      />
                    </View>
                    <View style={{ gap: 8 }}>
                      <ThemedText style={{ fontFamily: "SemiBold" }}>
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
                            fontFamily: "Regular",
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
                          inputStyles={{ color: color, width: "90%" }}
                          boxStyles={{
                            width: "80%",
                          }}
                          searchPlaceholder="Entrez une fréquence"
                          dropdownTextStyles={{ color: color }}
                          closeicon={
                            <Ionicons name="close" size={18} color={color} />
                          }
                          searchicon={
                            <Ionicons name="search" size={18} color={color} />
                          }
                          arrowicon={
                            <Feather
                              name="chevron-down"
                              size={24}
                              color={color}
                            />
                          }
                          save="key"
                        />
                      </View>
                    </View>
                    <View style={{ gap: 8 }}>
                      <ThemedText style={{ fontFamily: "SemiBold" }}>
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
                              placeholder="Date debut"
                              placeholderTextColor="#000"
                              style={{
                                borderWidth: 1,
                                borderColor: "gray",
                                padding: 10,
                                borderRadius: 10,
                                color: color,
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
                      fontFamily: "Bold",
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
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  const [fontLoaded] = useFonts({
    Bold: require("../../assets/fonts/Poppins-Bold.ttf"),
    BoldItalic: require("../../assets/fonts/Poppins-BoldItalic.ttf"),
    SemiBold: require("../../assets/fonts/Poppins-SemiBold.ttf"),
    Regular: require("../../assets/fonts/Poppins-Regular.ttf"),
  });

  useEffect(() => {
    if (fontLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontLoaded]);

  if (!fontLoaded) {
    return null;
  }

  return (
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
                fontFamily: "Bold",
                fontSize: 35,
                color: COLORS.primary,
              }}
            >
              S
              <ThemedText style={{ fontFamily: "SemiBold", fontSize: 22 }}>
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
              <ThemedText style={{ fontFamily: "Regular", fontSize: 14 }}>
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
              backgroundColor: color === "#FFFFFF" ? COLORS.white : COLORS.dark,
              borderRadius: 10,
              padding: 15,
              marginTop: 20,
              gap: 8,
            }}
          >
            <ThemedText
              style={{
                fontFamily: "Regular",
                color: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
              }}
            >
              Solde Total
            </ThemedText>
            <ThemedText
              style={{
                fontFamily: "Bold",
                color: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
                fontSize: 32,
              }}
            >
              30 000 FCFA
            </ThemedText>
            <ThemedText
              style={{
                fontFamily: "Regular",
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
                    backgroundColor: COLORS.primary,
                    height: 10,
                    width: "50%",
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
                    fontFamily: "Regular",
                    marginTop: 4,
                    color: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
                    fontSize: 12,
                  }}
                >
                  Depensé :{" "}
                  <Text style={{ fontFamily: "SemiBold" }}>15 000 FCFA </Text>/
                  20 000 FCFA
                </ThemedText>

                <Text
                  style={{
                    color: COLORS.primary,
                    fontFamily: "SemiBold",
                    fontSize: 12,
                  }}
                >
                  50%
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
                  fontFamily: "SemiBold",
                  color: color === "#FFFFFF" ? COLORS.white : COLORS.dark,
                }}
              >
                Nouvelle transaction
              </Text>
            </TouchableOpacity>
          </View>
          {/* Fin card */}

          {/* Payement à venir */}
          <View style={{ gap: 8, marginTop: 20 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <ThemedText style={{ fontFamily: "SemiBold", fontSize: 20 }}>
                Paiement à venir
              </ThemedText>
              <TouchableOpacity>
                <ThemedText>Voir plus</ThemedText>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ gap: 12, marginTop: 10 }}
              contentContainerStyle={{ gap: 13 }}
            >
              <TouchableOpacity
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  padding: 10,
                  backgroundColor:
                    color === "#FFFFFF" ? COLORS.noir : COLORS.white,
                  gap: 8,
                }}
              >
                <Image
                  source={require("../../assets/images/netflix.png")}
                  style={{ width: 70, height: 70, borderRadius: 16 }}
                />
                <ThemedText style={{ fontFamily: "SemiBold" }}>
                  Abonnement NetFlix
                </ThemedText>
                <ThemedText style={{ fontFamily: "Regular", fontSize: 12 }}>
                  15 Septembre
                </ThemedText>
                <ThemedText style={{ fontFamily: "Bold" }}>
                  2 400 FCFA
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  padding: 10,
                  backgroundColor:
                    color === "#FFFFFF" ? COLORS.noir : COLORS.white,
                  gap: 8,
                }}
              >
                <Image
                  source={require("../../assets/images/chatgpt.png")}
                  style={{ width: 70, height: 70, borderRadius: 16 }}
                />
                <ThemedText style={{ fontFamily: "SemiBold" }}>
                  Abonnement ChatGPT
                </ThemedText>
                <ThemedText style={{ fontFamily: "Regular", fontSize: 12 }}>
                  15 Septembre
                </ThemedText>
                <ThemedText style={{ fontFamily: "Bold" }}>
                  11 000 FCFA
                </ThemedText>
              </TouchableOpacity>
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
              <ThemedText style={{ fontFamily: "SemiBold", fontSize: 20 }}>
                Reçentes transactions
              </ThemedText>
              <TouchableOpacity>
                <ThemedText>Voir plus</ThemedText>
              </TouchableOpacity>
            </View>

            <View>
              {/* Date */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  // backgroundColor:
                  //   color === "#FFFFFF" ? COLORS.noir : COLORS.white,
                  padding: 10,
                  // borderRadius: 16,
                  alignItems: "center",
                }}
              >
                <ThemedText>01/02/2026</ThemedText>
                <View
                  style={{
                    backgroundColor:
                      color === "#FFFFFF"
                        ? COLORS.secondary
                        : "rgba(0, 0, 0, 0.14)",
                    height: 2,
                    borderRadius: 5,
                    overflow: "hidden",
                    width: "75%",
                    right: 0,
                    marginLeft: 10,
                  }}
                />
              </View>
              {/* Fin Date */}

              {/* transactions */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  // width: "100%",
                  gap: 8,
                }}
              >
                <Image
                  source={require("../../assets/images/expense.png")}
                  tintColor={color === "#FFFFFF" ? COLORS.white : COLORS.dark}
                  style={{ width: 60, height: 60 }}
                />
                <View
                  style={{ flexDirection: "column", gap: 4, width: "100%" }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "80%",
                    }}
                  >
                    <ThemedText style={{ fontFamily: "SemiBold" }}>
                      Achat de crédit
                    </ThemedText>
                    <ThemedText
                      style={{
                        fontFamily: "Bold",
                        fontSize: 14,
                        color: COLORS.red,
                      }}
                    >
                      1 000 CFA
                    </ThemedText>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "80%",
                    }}
                  >
                    <ThemedText
                      style={{ fontFamily: "Regular", color: COLORS.gray }}
                    >
                      Abonnement
                    </ThemedText>
                    <ThemedText
                      style={{
                        fontFamily: "Regular",
                        fontSize: 14,
                        color: COLORS.gray,
                      }}
                    >
                      Dépense
                    </ThemedText>
                  </View>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  // width: "100%",
                  gap: 8,
                }}
              >
                <Image
                  source={require("../../assets/images/income.png")}
                  tintColor={color === "#FFFFFF" ? COLORS.white : COLORS.dark}
                  style={{ width: 60, height: 60 }}
                />
                <View
                  style={{ flexDirection: "column", gap: 4, width: "100%" }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "80%",
                    }}
                  >
                    <ThemedText style={{ fontFamily: "SemiBold" }}>
                      Freelance
                    </ThemedText>
                    <ThemedText
                      style={{
                        fontFamily: "Bold",
                        fontSize: 14,
                        color: COLORS.green,
                      }}
                    >
                      100 000 CFA
                    </ThemedText>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "80%",
                    }}
                  >
                    <ThemedText
                      style={{ fontFamily: "Regular", color: COLORS.gray }}
                    >
                      Travail
                    </ThemedText>
                    <ThemedText
                      style={{
                        fontFamily: "Regular",
                        fontSize: 14,
                        color: COLORS.gray,
                      }}
                    >
                      Revenu
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          </View>
          {/* Fin Liste des transactions */}

          {/* Mes xp */}
          <View
          // style={{
          //   backgroundColor: color === "#FFFFFF" ? COLORS.white : COLORS.dark,
          //   borderRadius: 10,
          //   padding: 15,
          //   marginTop: 20,
          //   gap: 8,
          //   justifyContent: "center",
          //   alignItems: "center",
          // }}
          >
            {/* <Text
              style={{
                fontFamily: "SemiBold",
                color: COLORS.primary,
                fontSize: 22,
              }}
            >
              Mes xp
            </Text> */}
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 20,
            gap: 20,
            marginBottom: 100,
            height: SCREEN_HEIGHT,
            backgroundColor: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
          }}
        >
          {/* <TouchableOpacity
            style={{ alignItems: "flex-end" }}
            onPress={toggleSheet}
          >
            <MaterialCommunityIcons name="close" size={35} color="black" />
          </TouchableOpacity> */}

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
                    fontFamily: option === opt.key ? "SemiBold" : "Regular",
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
            <ThemedText style={{ fontFamily: "Regular" }}>
              Montant (CFA)
            </ThemedText>
            <TextInput
              placeholder="0"
              keyboardType="numeric"
              style={{
                fontFamily: "Bold",
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
                  inputStyles={{ color: color }}
                  searchPlaceholder="Entrez une catégorie"
                  dropdownTextStyles={{ color: color }}
                  closeicon={<Ionicons name="close" size={18} color={color} />}
                  searchicon={
                    <Ionicons name="search" size={18} color={color} />
                  }
                  arrowicon={
                    <Feather name="chevron-down" size={24} color={color} />
                  }
                  save="key"
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
                <ThemedText style={{ fontFamily: "SemiBold" }}>Note</ThemedText>
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
                    fontFamily: "Regular",
                  }}
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
                <ThemedText style={{ fontFamily: "SemiBold" }}>
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
                    fontFamily: "Regular",
                  }}
                  value={transactionData.name}
                  onChangeText={(e) =>
                    setTransactionData({ ...transactionData, name: e })
                  }
                />
              </View>
              <View style={{ gap: 8 }}>
                <ThemedText style={{ fontFamily: "SemiBold" }}>
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
                  closeicon={<Ionicons name="close" size={18} color={color} />}
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
                <ThemedText style={{ fontFamily: "SemiBold" }}>
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
                      fontFamily: "Regular",
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
                    inputStyles={{ color: color, width: "90%" }}
                    boxStyles={{
                      width: "80%",
                    }}
                    searchPlaceholder="Entrez une fréquence"
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
              </View>
              <View style={{ gap: 8 }}>
                <ThemedText style={{ fontFamily: "SemiBold" }}>
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
                fontFamily: "Bold",
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
      {/* </View>
      </Modal> */}
      {transactionModal()}
    </SafeAreaView>
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
