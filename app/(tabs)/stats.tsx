import CircularProgressBar from "@/components/CircularProgressBar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import Accordion from "@/src/components/Accordion";
import ExpenseCalendar60Days from "@/src/components/ExpenseCalendar60Days";
import PieChartRender from "@/src/components/PieChart";
import { getPeriodiqueTotalBalance } from "@/src/db/repositories/financeRepo";
import {
  dayWithMostExpense,
  dayWithMostIncome,
  ExpenseVsIncomePerPeriod,
  getTransactionsByPeriodAndCategory,
} from "@/src/db/repositories/statsRepo";
import {
  ExpenseDay,
  getExpenseCalendar60Days,
} from "@/src/services/stats/expenseCalendar";
import { getFinanceScore } from "@/src/services/stats/financeScore";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { useAppTextColor } from "@/src/utils/colos";
import { formatMoney } from "@/src/utils/format";
import { diffDays, toYYYYMMDD } from "@/src/utils/goalDates";
import { scale, verticalScale } from "@/src/utils/styling";
import { FontAwesome5, Octicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useRef, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";

const generateYear = () => {
  const startYear = new Date().getFullYear() - 1;
  const years = [];
  for (let i = 0; i <= 20; i++) {
    years.push(startYear + i);
  }
  return years;
};

export default function TabThreeScreen() {
  const color = useAppTextColor();
  const [loading, setLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [open, setOpen] = useState(false);
  const [open2, setOpen2] = useState(false);
  const [date, setDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [barData, setBarData] = React.useState<any>([]);
  const [pieData, setPieData] = React.useState<any>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [yearArray, setYearArray] = useState<number[]>(generateYear());
  const [analyse, setAnalyse] = useState<any>([]);
  const [finance, setFinance] = useState<any>(null);
  const [calendar, setCalendar] = useState<ExpenseDay[]>([]);
  const [solde, setSolde] = useState<{
    balance: number;
    expense: number;
    income: number;
  } | null>(null);
  const [statDatas, setStatDatas] = useState({
    from: new Date().toISOString().substring(0, 10),
    to: new Date().toISOString().substring(0, 10),
    month: currentMonth,
    year: currentYear,
  });
  const MOIS = [
    { value: "Janvier", key: 1 },
    { value: "Février", key: 2 },
    { value: "Mars", key: 3 },
    { value: "Avril", key: 4 },
    { value: "Mai", key: 5 },
    { value: "Juin", key: 6 },
    { value: "Juillet", key: 7 },
    { value: "Août", key: 8 },
    { value: "Septembre", key: 9 },
    { value: "Octobre", key: 10 },
    { value: "Novembre", key: 11 },
    { value: "Décembre", key: 12 },
  ];

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
        setStatDatas({
          ...statDatas,
          from: currentDate.toISOString().substring(0, 10),
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
        setStatDatas({
          ...statDatas,
          to: currentDate.toISOString().substring(0, 10),
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
    setStatDatas({
      ...statDatas,
      from: date.toISOString().substring(0, 10),
    });
    toggleDatePicker();
  };

  const confirmIOSDate2 = () => {
    // console.log(date.toISOString().substring(0, 10));
    setStatDatas({
      ...statDatas,
      to: date.toISOString().substring(0, 10),
    });
    toggleDatePicker2();
  };

  const getDatas = async () => {
    setLoading(true);

    const res = await getPeriodiqueTotalBalance(
      selectedIndex === 0
        ? "dayly"
        : selectedIndex === 1
          ? "weekly"
          : selectedIndex === 2
            ? "monthly"
            : "yearly",
      selectedIndex === 0
        ? statDatas.from
        : selectedIndex === 1
          ? `${toYYYYMMDD(new Date(statDatas.from))};${toYYYYMMDD(new Date(statDatas.to))}`
          : selectedIndex === 2
            ? currentMonth > 9
              ? currentMonth.toString()
              : `0${currentMonth}`
            : currentYear.toString(),
    );
    setSolde(res);

    const chartData = await ExpenseVsIncomePerPeriod(
      selectedIndex === 0
        ? "dayly"
        : selectedIndex === 1
          ? "weekly"
          : selectedIndex === 2
            ? "monthly"
            : "yearly",
      selectedIndex === 0
        ? statDatas.from
        : selectedIndex === 1
          ? `${toYYYYMMDD(new Date(statDatas.from))};${toYYYYMMDD(new Date(statDatas.to))}`
          : selectedIndex === 2
            ? currentMonth > 9
              ? currentMonth.toString()
              : `0${currentMonth}`
            : currentYear.toString(),
    );

    console.log("chartData", chartData);

    const formatData = chartData.map((item: any) => {
      const numericValue = Number(item.value) || 0;
      return {
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
              {numericValue === 0
                ? ""
                : Number.isInteger(numericValue)
                  ? `${numericValue}k`
                  : `${numericValue.toFixed(1)}k`}{" "}
              {/* Affiche la valeur suivie de "k" */}
            </ThemedText>
          </View>
        ),
      };
    });
    setBarData(formatData);

    const datasPie = await getTransactionsByPeriodAndCategory(
      selectedIndex === 0
        ? "dayly"
        : selectedIndex === 1
          ? "weekly"
          : selectedIndex === 2
            ? "monthly"
            : "yearly",
      selectedIndex === 0
        ? statDatas.from
        : selectedIndex === 1
          ? `${toYYYYMMDD(new Date(statDatas.from))};${toYYYYMMDD(new Date(statDatas.to))}`
          : selectedIndex === 2
            ? currentMonth > 9
              ? currentMonth.toString()
              : `0${currentMonth}`
            : currentYear.toString(),
      res.expense,
    );
    setPieData(datasPie);

    let datas: any = [];

    if (selectedIndex > 0) {
      if (selectedIndex === 1) {
        const mostExpense = await dayWithMostExpense(
          statDatas.from,
          statDatas.to,
        );
        const mostIncome = await dayWithMostIncome(
          statDatas.from,
          statDatas.to,
        );

        datas = [
          { type: "depense", ...mostExpense },
          { type: "entree", ...mostIncome },
        ];
      }

      if (selectedIndex === 2) {
        const year = new Date().getFullYear();
        const month = parseInt(currentMonth.toString().padStart(2, "0"));

        const firstDayOfMonth = new Date(year, month - 1, 1); // 1er jour (ex: Mars est index 2)
        const lastDayOfMonth = new Date(year, month, 0); // Dernier jour
        const mostExpense = await dayWithMostExpense(
          firstDayOfMonth.toISOString().slice(0, 10),
          lastDayOfMonth.toISOString().slice(0, 10),
        );

        const mostIncome = await dayWithMostIncome(
          firstDayOfMonth.toISOString().slice(0, 10),
          lastDayOfMonth.toISOString().slice(0, 10),
        );

        datas = [
          { type: "depense", ...mostExpense },
          { type: "entree", ...mostIncome },
        ];
      }

      if (selectedIndex === 3) {
        const firstDayOfYear = new Date(currentYear, 0, 1); // 1er janvier
        const lastDayOfYear = new Date(currentYear, 11, 31);
        const mostExpense = await dayWithMostExpense(
          firstDayOfYear.toISOString().slice(0, 10),
          lastDayOfYear.toISOString().slice(0, 10),
        );
        const mostIncome = await dayWithMostIncome(
          firstDayOfYear.toISOString().slice(0, 10),
          lastDayOfYear.toISOString().slice(0, 10),
        );

        datas = [
          { type: "depense", ...mostExpense },
          { type: "entree", ...mostIncome },
        ];
      }

      setAnalyse(datas);
      console.log("datas", datas);
    }

    let days = 1;

    switch (selectedIndex) {
      case 0:
        days = 1;
        break;
      case 1:
        days = diffDays(new Date(statDatas.to), new Date(statDatas.from)) + 1;
        break;
      case 2:
        const year = new Date().getFullYear();
        const month = parseInt(currentMonth.toString().padStart(2, "0"));
        const firstDayOfMonth = new Date(year, month - 1, 1);
        const lastDayOfMonth = new Date(year, month, 0);
        days = diffDays(lastDayOfMonth, firstDayOfMonth) + 1;
        break;
      case 3:
        const firstDayOfYear = new Date(currentYear, 0, 1);
        const lastDayOfYear = new Date(currentYear, 11, 31);
        days = diffDays(lastDayOfYear, firstDayOfYear) + 1;
        break;
    }

    console.log("days", days);

    const financeScore = await getFinanceScore({ days });
    setFinance(financeScore);
    console.log("financeScore", financeScore);

    const data = await getExpenseCalendar60Days();
    setCalendar(data);
    setLoading(false);
  };

  const ScrollViewRef = useRef<ScrollView>(null);

  function handleAccordionOpen(itemLayoutY: number, itemContentHeight: number) {
    ScrollViewRef.current?.scrollTo({
      y: itemLayoutY - 100,
      animated: true,
    });
  }

  // useEffect(() => {
  //   getDatas();
  // }, [selectedIndex, statDatas.from, statDatas.to, currentMonth, currentYear]);

  useFocusEffect(
    useCallback(() => {
      getDatas();
    }, [
      selectedIndex,
      statDatas.from,
      statDatas.to,
      currentMonth,
      currentYear,
    ]),
  );

  const isReady = !!solde && !!finance;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={{ flex: 1 }}>
        {!isReady && (
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
          // ref={ScrollViewRef}
          contentContainerStyle={{ padding: 20, gap: 22, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl onRefresh={getDatas} refreshing={loading} />
          }
        >
          {isReady ? (
            <>
              <Text
                style={{
                  fontFamily: FONT_FAMILY.bold,
                  fontSize: 30,
                  color: color,
                  flexWrap: "wrap",
                }}
              >
                Statistiques
              </Text>
              <SegmentedControl
                values={["Jour", "Periode", "Mois", "Annee"]}
                selectedIndex={selectedIndex}
                onChange={(event) => {
                  setSelectedIndex(event.nativeEvent.selectedSegmentIndex);
                }}
                fontStyle={{ fontFamily: FONT_FAMILY.regular, fontSize: 14 }}
                activeFontStyle={{ fontFamily: FONT_FAMILY.bold, fontSize: 14 }}
                style={{ height: 40 }}
              />

              <View>
                {selectedIndex === 0 && (
                  <View style={{ gap: 8 }}>
                    <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                      Date
                    </ThemedText>
                    <View
                      style={{
                        width: "100%",
                        gap: 8,
                      }}
                    >
                      {open && (
                        <DateTimePicker
                          mode="date"
                          display="spinner"
                          value={
                            statDatas.from
                              ? new Date(statDatas.from)
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
                            placeholder="Date"
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
                            value={statDatas.from}
                            onChangeText={(e: any) =>
                              setStatDatas({
                                ...statDatas,
                                from: e,
                              })
                            }
                            onPressIn={toggleDatePicker}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
                {selectedIndex === 1 && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ gap: 8, width: "48%" }}>
                      <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                        Du
                      </ThemedText>
                      <View
                        style={{
                          width: "100%",
                          gap: 8,
                        }}
                      >
                        {open && (
                          <DateTimePicker
                            mode="date"
                            display="spinner"
                            value={
                              statDatas.from
                                ? new Date(statDatas.from)
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
                              placeholder="Date"
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
                              value={statDatas.from}
                              onChangeText={(e: any) =>
                                setStatDatas({
                                  ...statDatas,
                                  from: e,
                                })
                              }
                              onPressIn={toggleDatePicker}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <View style={{ gap: 8, width: "48%" }}>
                      <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                        Au
                      </ThemedText>
                      <View
                        style={{
                          width: "100%",
                          gap: 8,
                        }}
                      >
                        {open2 && (
                          <DateTimePicker
                            mode="date"
                            display="spinner"
                            value={
                              statDatas.to ? new Date(statDatas.to) : new Date()
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
                              placeholder="Date"
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
                              value={statDatas.to}
                              onChangeText={(e: any) =>
                                setStatDatas({
                                  ...statDatas,
                                  to: e,
                                })
                              }
                              onPressIn={toggleDatePicker2}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                )}
                {selectedIndex === 2 && (
                  <View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginVertical: 10 }}
                      contentContainerStyle={{ gap: 15, paddingHorizontal: 5 }}
                    >
                      {MOIS.map((m) => (
                        <TouchableOpacity
                          key={m.key}
                          style={{
                            padding: 10,
                            borderRadius: 8,
                            backgroundColor:
                              currentMonth === m.key ? "#007AFF" : "#E0E0E0",
                            alignItems: "center",
                            gap: 6,
                            flexDirection: "row",
                          }}
                          onPress={() => setCurrentMonth(m.key)}
                        >
                          <FontAwesome5
                            name="calendar-alt"
                            size={24}
                            color={
                              currentMonth === m.key ? "#FFFFFF" : "#000000"
                            }
                          />
                          <ThemedText
                            style={{
                              color:
                                currentMonth === m.key ? "#FFFFFF" : "#000000",
                              fontFamily:
                                currentMonth === m.key
                                  ? FONT_FAMILY.medium
                                  : FONT_FAMILY.regular,
                            }}
                          >
                            {m.value}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {selectedIndex === 3 && (
                  <View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginVertical: 10 }}
                      contentContainerStyle={{ gap: 15, paddingHorizontal: 5 }}
                    >
                      {yearArray.map((m) => (
                        <TouchableOpacity
                          key={m}
                          style={{
                            padding: 10,
                            borderRadius: 8,
                            backgroundColor:
                              currentYear === m ? "#007AFF" : "#E0E0E0",
                            alignItems: "center",
                            gap: 6,
                            flexDirection: "row",
                          }}
                          onPress={() => setCurrentYear(m)}
                        >
                          <ThemedText
                            style={{
                              color: currentYear === m ? "#FFFFFF" : "#000000",
                              fontFamily:
                                currentYear === m
                                  ? FONT_FAMILY.medium
                                  : FONT_FAMILY.regular,
                            }}
                          >
                            {m}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Solde total card */}
              <View
                style={{
                  gap: 12,
                  padding: 20,
                  borderRadius: 12,
                  backgroundColor: COLORS.gray + "20",
                  borderWidth: 1,
                  borderColor: COLORS.green + "20",
                }}
              >
                <Text
                  style={{
                    fontFamily: FONT_FAMILY.medium,
                    fontSize: 16,
                    color: COLORS.gray,
                  }}
                >
                  Solde Total
                </Text>
                <ThemedText
                  style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 22 }}
                >
                  {formatMoney(solde?.balance as any)} CFA
                </ThemedText>
              </View>

              {/* Dépense et entrée card */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    gap: 12,
                    padding: 20,
                    borderRadius: 12,
                    backgroundColor: COLORS.gray + "20",
                    borderWidth: 1,
                    borderColor: COLORS.green + "20",
                    width: "48%",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: FONT_FAMILY.medium,
                      fontSize: 14,
                      color: COLORS.gray,
                    }}
                  >
                    Dépenses (CFA)
                  </Text>
                  <ThemedText
                    style={{
                      fontFamily: FONT_FAMILY.semibold,
                      fontSize: 22,
                      color: COLORS.red,
                    }}
                  >
                    {formatMoney(solde?.expense as any)}
                  </ThemedText>
                </View>

                <View
                  style={{
                    gap: 12,
                    padding: 20,
                    borderRadius: 12,
                    backgroundColor: COLORS.gray + "20",
                    borderWidth: 1,
                    borderColor: COLORS.green + "20",
                    width: "48%",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: FONT_FAMILY.medium,
                      fontSize: 14,
                      color: COLORS.gray,
                    }}
                  >
                    Entrées (CFA)
                  </Text>
                  <ThemedText
                    style={{
                      fontFamily: FONT_FAMILY.semibold,
                      fontSize: 22,
                      color: COLORS.green,
                    }}
                  >
                    {formatMoney(solde?.income as any)}
                  </ThemedText>
                </View>
              </View>

              {/* Chart */}
              <ThemedView
                lightColor={COLORS.white}
                darkColor={COLORS.dark}
                style={{ gap: 12, padding: 20, borderRadius: 12 }}
              >
                <Text
                  style={{
                    fontFamily: FONT_FAMILY.medium,
                    fontSize: 16,
                    color: COLORS.gray,
                  }}
                >
                  Entrée vs Dépense
                </Text>

                {/* Chart */}
                {isReady && barData.length > 0 && (
                  <BarChart
                    key={barData.length}
                    data={barData}
                    width={290}
                    height={200}
                    minHeight={3}
                    noOfSections={4}
                    spacing={scale(12)}
                    barWidth={scale(25)}
                    stepValue={100}
                    // maxValue={1000}
                    // barStyle={{ borderRadius: 4 }}
                    yAxisThickness={0}
                    hideYAxisText={false}
                    xAxisThickness={0}
                    yAxisTextStyle={{
                      color: color,
                      fontFamily: FONT_FAMILY.regular,
                      fontSize: verticalScale(12),
                    }}
                    xAxisLabelTextStyle={{
                      color: color,
                      fontFamily: FONT_FAMILY.regular,
                      fontSize: verticalScale(12),
                    }}
                    roundedTop
                    roundedBottom
                    showXAxisIndices={false}
                    dashGap={10}
                    dashWidth={0}
                    frontColor={COLORS.primary}
                    isAnimated
                    animationDuration={500}
                    stackHighlightEnabled
                    formatYLabel={(value) => `${parseInt(value)}k`}
                    autoShiftLabels={false}
                    showFractionalValues={true}
                    showLine
                    lineConfig={{
                      color: "#F29C6E",
                      thickness: 3,
                      curved: true,
                      hideDataPoints: true,
                      shiftY: 30,
                      initialSpacing: -30,
                    }}
                  />
                )}

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-around",
                    flexWrap: "wrap",
                  }}
                >
                  {["Entrée", "Dépense"].map((item: any, index: number) => (
                    <View
                      key={index}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 5,
                      }}
                    >
                      <View
                        style={{
                          height: 10,
                          width: 10,
                          borderRadius: 5,
                          backgroundColor:
                            item === "Entrée" ? COLORS.green : COLORS.red,
                          marginRight: 10,
                        }}
                      />
                      <ThemedText style={{ fontSize: 14 }}>{item}</ThemedText>
                    </View>
                  ))}
                </View>
              </ThemedView>

              {/* Dépense par catégorie */}
              <ThemedView
                lightColor={COLORS.white}
                darkColor={COLORS.dark}
                style={{ gap: 12, padding: 20, borderRadius: 12 }}
              >
                <ThemedText
                  style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 16 }}
                >
                  Dépenses par catégories
                </ThemedText>

                {isReady && pieData.length > 0 && (
                  <PieChartRender datas={pieData} />
                )}
                <Accordion
                  categorie={{
                    titre: "Afficher les détails",
                    content: pieData,
                  }}
                  onAccordionOpen={handleAccordionOpen}
                />
              </ThemedView>

              {/* Analyses jours */}
              {selectedIndex > 0 && (
                <>
                  <Text
                    style={{
                      fontFamily: FONT_FAMILY.medium,
                      fontSize: 16,
                      color: COLORS.gray,
                    }}
                  >
                    Analyse jours
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <ThemedView
                      lightColor={COLORS.white}
                      darkColor={COLORS.dark}
                      style={{
                        gap: 12,
                        padding: 20,
                        borderRadius: 12,
                        width: "48%",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: FONT_FAMILY.medium,
                          fontSize: 12,
                          color: COLORS.gray,
                        }}
                      >
                        PIC DE DEPENSES
                      </Text>

                      {analyse.find((a: any) => a.type === "depense")?.day ? (
                        <>
                          <Text
                            style={{
                              fontFamily: FONT_FAMILY.regular,
                              fontSize: 16,
                              color: COLORS.red,
                              padding: 4,
                              borderRadius: 50,
                              textAlign: "center",
                              backgroundColor: COLORS.red + "20",
                            }}
                          >
                            {new Date(
                              analyse.find((a: any) => a.type === "depense")
                                ?.day,
                            ).toLocaleString("fr-FR", {
                              // weekday: "long",
                              day: "2-digit",
                              month: "long",
                            })}
                          </Text>

                          <ThemedText
                            style={{
                              fontFamily: FONT_FAMILY.semibold,
                              fontSize: 14,
                            }}
                          >
                            {formatMoney(
                              analyse.find((a: any) => a.type === "depense")
                                ?.total,
                            )}{" "}
                            CFA
                          </ThemedText>
                        </>
                      ) : (
                        <ThemedText
                          style={{
                            fontFamily: FONT_FAMILY.regular,
                            fontSize: 16,
                          }}
                        >
                          Aucun pic de dépenses
                        </ThemedText>
                      )}
                    </ThemedView>
                    <ThemedView
                      lightColor={COLORS.white}
                      darkColor={COLORS.dark}
                      style={{
                        gap: 12,
                        padding: 20,
                        borderRadius: 12,
                        width: "48%",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: FONT_FAMILY.medium,
                          fontSize: 12,
                          color: COLORS.gray,
                        }}
                      >
                        MEILLEUR REVENU
                      </Text>
                      {analyse.find((a: any) => a.type === "entree")?.day ? (
                        <>
                          <Text
                            style={{
                              fontFamily: FONT_FAMILY.regular,
                              fontSize: 16,
                              color: COLORS.green,
                              padding: 4,
                              borderRadius: 50,
                              textAlign: "center",
                              backgroundColor: COLORS.green + "20",
                            }}
                          >
                            {new Date(
                              analyse.find((a: any) => a.type === "entree")
                                ?.day,
                            ).toLocaleString("fr-FR", {
                              // weekday: "long",
                              day: "2-digit",
                              month: "long",
                            })}
                          </Text>
                          <ThemedText
                            style={{
                              fontFamily: FONT_FAMILY.semibold,
                              fontSize: 14,
                            }}
                          >
                            {formatMoney(
                              analyse.find((a: any) => a.type === "entree")
                                ?.total,
                            )}{" "}
                            CFA
                          </ThemedText>
                        </>
                      ) : (
                        <ThemedText
                          style={{
                            fontFamily: FONT_FAMILY.regular,
                            fontSize: 16,
                          }}
                        >
                          Aucun meilleur revenu
                        </ThemedText>
                      )}
                    </ThemedView>
                  </View>
                </>
              )}

              {/* Score financier */}
              <View>
                <Text
                  style={{
                    fontFamily: FONT_FAMILY.medium,
                    fontSize: 16,
                    color: COLORS.gray,
                  }}
                >
                  Score financier:{" "}
                </Text>

                <ThemedView
                  lightColor={COLORS.white}
                  darkColor={COLORS.dark}
                  style={{ gap: 30, padding: 20, borderRadius: 12 }}
                >
                  <View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                    }}
                  >
                    <CircularProgressBar
                      radius={80}
                      strokeWidth={17}
                      percentage={finance.total ?? 0}
                      end={(finance.total ?? 0) / 100}
                    />

                    <Text
                      style={{
                        fontFamily: FONT_FAMILY.semibold,
                        fontSize: 14,
                        color: COLORS.green,
                        padding: 10,
                        borderRadius: 50,
                        textAlign: "center",
                        backgroundColor: COLORS.green + "20",
                      }}
                    >
                      {finance ? `${finance.summary.label}` : ""}
                    </Text>
                  </View>

                  <View style={{ gap: 12 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <ThemedText
                        style={{
                          fontFamily: FONT_FAMILY.semibold,
                          fontSize: 16,
                        }}
                      >
                        Régularité
                      </ThemedText>
                      <Text
                        style={{
                          fontFamily: FONT_FAMILY.semibold,
                          fontSize: 16,
                          color: COLORS.gray,
                        }}
                      >
                        {finance ? `${finance.regularity}` : "0"}%
                      </Text>
                    </View>
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
                          backgroundColor: finance
                            ? finance.regularity >= 70
                              ? COLORS.green
                              : finance.regularity >= 50
                                ? COLORS.orange
                                : COLORS.red
                            : COLORS.red,
                          height: 10,
                          width: finance ? `${finance.regularity}%` : "0%",
                        }}
                      />
                    </View>
                  </View>

                  <View style={{ gap: 12 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <ThemedText
                        style={{
                          fontFamily: FONT_FAMILY.semibold,
                          fontSize: 16,
                        }}
                      >
                        Discipline
                      </ThemedText>
                      <Text
                        style={{
                          fontFamily: FONT_FAMILY.semibold,
                          fontSize: 16,
                          color: COLORS.gray,
                        }}
                      >
                        {finance ? `${finance.discipline}` : "0"}%
                      </Text>
                    </View>
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
                          backgroundColor: finance
                            ? finance.discipline >= 70
                              ? COLORS.green
                              : finance.discipline >= 50
                                ? COLORS.orange
                                : COLORS.red
                            : COLORS.red,
                          height: 10,
                          width: finance ? `${finance.discipline}%` : "0%",
                        }}
                      />
                    </View>
                  </View>

                  <View style={{ gap: 12 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <ThemedText
                        style={{
                          fontFamily: FONT_FAMILY.semibold,
                          fontSize: 16,
                        }}
                      >
                        Contrôle budgetaire
                      </ThemedText>
                      <Text
                        style={{
                          fontFamily: FONT_FAMILY.semibold,
                          fontSize: 16,
                          color: COLORS.gray,
                        }}
                      >
                        {finance ? `${finance.budgetControl}` : "0"}%
                      </Text>
                    </View>
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
                          backgroundColor: finance
                            ? finance.budgetControl >= 70
                              ? COLORS.green
                              : finance.budgetControl >= 50
                                ? COLORS.orange
                                : COLORS.red
                            : COLORS.red,
                          height: 10,
                          width: finance ? `${finance.budgetControl}%` : "0%",
                        }}
                      />
                    </View>
                  </View>

                  <View style={{ gap: 12 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <ThemedText
                        style={{
                          fontFamily: FONT_FAMILY.semibold,
                          fontSize: 16,
                        }}
                      >
                        Force d'épargne
                      </ThemedText>
                      <Text
                        style={{
                          fontFamily: FONT_FAMILY.semibold,
                          fontSize: 16,
                          color: COLORS.gray,
                        }}
                      >
                        {finance ? `${finance.savingPower}` : "0"}%
                      </Text>
                    </View>
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
                          backgroundColor: finance
                            ? finance.savingPower >= 70
                              ? COLORS.green
                              : finance.savingPower >= 50
                                ? COLORS.orange
                                : COLORS.red
                            : COLORS.red,
                          height: 10,
                          width: finance ? `${finance.savingPower}%` : "0%",
                        }}
                      />
                    </View>
                  </View>

                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.gray,
                      padding: 10,
                      borderRadius: 16,
                      backgroundColor: COLORS.gray + "30",
                      flexDirection: "row",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 5,
                    }}
                  >
                    <Octicons
                      name="sparkles-fill"
                      size={24}
                      color={COLORS.green}
                    />
                    <ThemedText
                      style={{
                        fontFamily: FONT_FAMILY.medium,
                        flexWrap: "wrap",
                        fontSize: 14,
                        width: "90%",
                        flex: 1,
                      }}
                    >
                      {finance ? finance.summary.message : "Rien à signaler"}
                    </ThemedText>
                  </View>
                </ThemedView>
              </View>

              {/* Calendrier de dépense */}
              {calendar.length === 60 && (
                <ExpenseCalendar60Days data={calendar} />
              )}
            </>
          ) : (
            <View style={{ height: 500 }} />
          )}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}
