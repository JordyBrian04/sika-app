import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getBudgetDetailByID } from "@/src/db/repositories/budgetRepo";
import {
  getLastSixMonthsSpendingByCategory,
  getPeriode,
  getTransactionsByMonthYearAndCategory,
} from "@/src/db/repositories/transactions";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { formatMoney } from "@/src/utils/format";
import { AntDesign, Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  FlatList,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SelectList } from "react-native-dropdown-select-list";
import { BarChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const DetailBudget = () => {
  const params = useLocalSearchParams();
  const [detail, setDetail] = React.useState<any>(null);
  const [period, setPeriod] = React.useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>(
    new Date().toISOString().slice(0, 7),
  ); // Default to current month (YYYY-MM)
  const [barData, setBarData] = React.useState<any>([]);
  const [transactions, setTransactions] = React.useState<any[]>([]);

  const fetchPeriod = async () => {
    const period = await getPeriode();
    console.log(
      "Fetched period:",
      period.map((p) => ({ key: p.periode, value: formatDate(p.periode) })),
    );

    setPeriod(
      period.map((p) => ({ key: p.periode, value: formatDate(p.periode) })),
    );
  };

  const fetchBudgetDetail = async (periode: string) => {
    console.log("Fetching budget detail for ID:", Number(params.id));
    const detail = await getBudgetDetailByID(Number(params.id), periode);
    console.log(detail[0]);
    setDetail(detail[0]);
  };

  const handlePeriodChange = (val: string) => {
    setSelectedPeriod(val);
    fetchBudgetDetail(val);
    getBudgetTransactions(val);
    getBarChatData(val);
  };

  const groupTransactionsByDate = (transactions: any[]) => {
    const groups = transactions.reduce((acc, transaction) => {
      const date = transaction.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(transaction);
      return acc;
    }, {});

    // On transforme l'objet en tableau pour le rendu
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        date,
        data: groups[date],
      }));
  };

  const getBudgetTransactions = async (period: string) => {
    const [year, month] = period.split("-").map(Number);
    const transactions = await getTransactionsByMonthYearAndCategory(
      month,
      year,
      Number(detail?.categoryId),
    );
    console.log(
      "Transactions for budget:",
      groupTransactionsByDate(transactions),
    );
    setTransactions(groupTransactionsByDate(transactions));
  };

  const formatValue = (val: number) => {
    if (val >= 1000) {
      return (val / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    }
    return val.toString();
  };

  const getBarChatData = async (period: string) => {
    const [year, month] = period.split("-").map(Number);
    const transactions = await getLastSixMonthsSpendingByCategory(
      Number(detail?.categoryId),
      month,
      year,
    );
    const formattedData = transactions.map((item) => ({
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
    console.log("Bar chart data:", formattedData);
    setBarData(formattedData);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchPeriod();
      fetchBudgetDetail(selectedPeriod);
      getBudgetTransactions(selectedPeriod);
      getBarChatData(selectedPeriod);
    }, [params.id, selectedPeriod, detail?.categoryId]),
  );
  //   console.log("DetailBudget params", params);
  const color = useThemeColor({ light: "#000000", dark: "#FFFFFF" }, "text");
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
              gap: 55,
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
              Détails du budget
            </ThemedText>
          </View>

          {/* Card */}
          <View
            style={{
              marginTop: 20,
              padding: 15,
              backgroundColor:
                color === "#FFFFFF" ? COLORS.dark : COLORS.secondary,
              borderRadius: 8,
              gap: 15,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  backgroundColor:
                    color === "#FFFFFF" ? COLORS.secondary : COLORS.dark,
                  padding: 15,
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 15,
                  width: 60,
                  justifyContent: "center",
                  height: 60,
                }}
              >
                <Image
                  source={
                    detail?.categoryName.toLowerCase().includes("alimentation")
                      ? require("../../assets/images/diet.png")
                      : detail?.categoryName.toLowerCase().includes("transport")
                        ? require("../../assets/images/transportation.png")
                        : detail?.categoryName.toLowerCase().includes("facture")
                          ? require("../../assets/images/bill.png")
                          : detail?.categoryName
                                .toLowerCase()
                                .includes("abonnement")
                            ? require("../../assets/images/membership.png")
                            : detail?.categoryName
                                  .toLowerCase()
                                  .includes("sante")
                              ? require("../../assets/images/pills.png")
                              : detail?.categoryName
                                    .toLowerCase()
                                    .includes("loisirs")
                                ? require("../../assets/images/theater.png")
                                : detail?.categoryName
                                      .toLowerCase()
                                      .includes("salaire")
                                  ? require("../../assets/images/payroll.png")
                                  : detail?.categoryName
                                        .toLowerCase()
                                        .includes("depart")
                                    ? require("../../assets/images/salary.png")
                                    : detail?.categoryName
                                          .toLowerCase()
                                          .includes("mission")
                                      ? require("../../assets/images/mission.png")
                                      : detail?.categoryName
                                            .toLowerCase()
                                            .includes("famille")
                                        ? require("../../assets/images/big-family.png")
                                        : detail?.categoryName
                                              .toLowerCase()
                                              .includes("education")
                                          ? require("../../assets/images/stack-of-books.png")
                                          : detail?.categoryName
                                                .toLowerCase()
                                                .includes("shopping")
                                            ? require("../../assets/images/online-shopping.png")
                                            : detail?.categoryName
                                                  .toLowerCase()
                                                  .includes(
                                                    "téléphone/internet",
                                                  )
                                              ? require("../../assets/images/iphone.png")
                                              : detail?.categoryName
                                                    .toLowerCase()
                                                    .includes("soin")
                                                ? require("../../assets/images/lotions.png")
                                                : require("../../assets/images/shapes.png")
                  }
                  style={{ width: 40, height: 40 }}
                />
              </View>
              <View style={{ width: "75%", gap: 4 }}>
                <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                  {detail?.categoryName || "Catégorie"}
                </ThemedText>
                <SelectList
                  setSelected={handlePeriodChange}
                  data={period || []}
                  save="key"
                  placeholder="Sélectionnez une période"
                  defaultOption={
                    period?.find((p: any) => p.key === selectedPeriod) || null
                  }
                  inputStyles={{
                    color: color,
                    fontFamily: FONT_FAMILY.regular,
                    borderWidth: 0,
                  }}
                  boxStyles={{ borderWidth: 0, paddingHorizontal: 0 }}
                  dropdownStyles={{ borderWidth: 0, paddingHorizontal: 0 }}
                  searchPlaceholder="Entrez une période..."
                  dropdownTextStyles={{
                    color: color,
                    fontFamily: FONT_FAMILY.regular,
                  }}
                  closeicon={<Ionicons name="close" size={18} color={color} />}
                  searchicon={
                    <Ionicons name="search" size={18} color={color} />
                  }
                  arrowicon={
                    <Feather name="chevron-down" size={24} color={color} />
                  }
                />
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  gap: 3,
                }}
              >
                <ThemedText style={{ fontFamily: FONT_FAMILY.medium }}>
                  Montant dépensé
                </ThemedText>
                <ThemedText
                  style={{
                    fontFamily: FONT_FAMILY.bold,
                    fontSize: 18,
                    color: COLORS.red,
                  }}
                >
                  {formatMoney(detail?.totalSpent) || 0} CFA
                </ThemedText>
              </View>
              <View
                style={{
                  alignItems: "flex-end",
                  justifyContent: "flex-end",
                  gap: 3,
                }}
              >
                <ThemedText style={{ fontFamily: FONT_FAMILY.medium }}>
                  Budget
                </ThemedText>
                <ThemedText
                  style={{ fontFamily: FONT_FAMILY.bold, fontSize: 18 }}
                >
                  {formatMoney(detail?.monthlyLimit) || 0} CFA
                </ThemedText>
              </View>
            </View>

            <View style={{ gap: 6 }}>
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
                    backgroundColor:
                      detail && detail.monthlyLimit > 0
                        ? detail.percentageUsed >= 70
                          ? COLORS.red
                          : detail.percentageUsed >= 50
                            ? COLORS.orange
                            : COLORS.primary
                        : COLORS.primary,
                    height: 10,
                    width: detail
                      ? `${detail.percentageUsed.toFixed(0)}%`
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
                  style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12 }}
                >
                  {`${detail?.percentageUsed?.toFixed(0) ?? 0} %`} utilisé
                </ThemedText>

                <ThemedText
                  style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 12 }}
                >
                  {detail?.remaining > 0 ? (
                    <Text style={{ color: COLORS.green }}>
                      {`${formatMoney(detail.remaining)} CFA restants`}
                    </Text>
                  ) : (
                    <Text style={{ color: COLORS.red }}>Budget dépassé</Text>
                  )}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Chart */}
          <View
            style={{
              padding: 15,
              backgroundColor:
                color === "#FFFFFF" ? COLORS.dark : COLORS.secondary,
              borderRadius: 8,
              gap: 15,
            }}
          >
            <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
              Dépenses des 6 derniers mois
            </ThemedText>
            <BarChart
              key={barData.length}
              data={barData}
              width={290}
              height={200}
              minHeight={3}
              noOfSections={4}
              // showValuesAsTopLabel={true}
              // topLabelContainerStyle={{
              //   marginBottom: 4,
              //   width: "100%",
              //   // alignItems: "center",
              // }}
              // topLabelTextStyle={{
              //   color: color,
              //   fontFamily: FONT_FAMILY.medium,
              //   // textAlign: "center",
              //   fontSize: 10,
              // }}
              spacing={25}
              barWidth={25}
              stepValue={10000}
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

          <View style={{ gap: 12 }}>
            <ThemedText
              style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 18 }}
            >
              Liste des transactions
            </ThemedText>
            <View style={{ gap: 12 }}>
              <FlatList
                data={transactions}
                keyExtractor={(item) => item.date}
                renderItem={({ item }) => (
                  <View style={{ marginBottom: 20 }}>
                    <Text
                      style={{
                        fontFamily: FONT_FAMILY.medium,
                        fontSize: 16,
                        marginBottom: 10,
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

                    {item.data.map((trans: any) => (
                      <TouchableOpacity
                        key={trans.id}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          backgroundColor:
                            color === "#FFFFFF"
                              ? COLORS.dark
                              : COLORS.secondary,
                          padding: 10,
                          borderRadius: 8,
                          marginBottom: 8,
                        }}
                        onPress={
                          () =>
                            router.push({
                              pathname: "/(screens)/DetailTransactions",
                              params: {
                                id: trans.id,
                                amount: trans.amount,
                                note: trans.note,
                                date: trans.date,
                                name: trans.name,
                                type: trans.type,
                                created_at: trans.created_at,
                              },
                            })
                          // console.log("Transaction details on press:", trans)
                        }
                      >
                        <View
                          style={{
                            backgroundColor:
                              color === "#FFFFFF"
                                ? COLORS.secondary
                                : COLORS.dark,
                            padding: 15,
                            borderRadius: 8,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 15,
                            width: 60,
                            justifyContent: "center",
                            height: 60,
                          }}
                        >
                          <Image
                            source={require("../../assets/images/expense.png")}
                            tintColor={
                              color === "#FFFFFF" ? COLORS.dark : COLORS.white
                            }
                            style={{ width: 40, height: 40 }}
                          />
                        </View>

                        <View style={{ width: "55%", gap: 4 }}>
                          <ThemedText
                            style={{
                              fontSize: 14,
                              fontFamily: FONT_FAMILY.semibold,
                              // color:
                              //   color === "#FFFFFF"
                              //     ? COLORS.dark
                              //     : COLORS.white,
                            }}
                            ellipsizeMode="tail"
                            numberOfLines={1}
                          >
                            {trans.note}
                          </ThemedText>
                          <ThemedText
                            style={{
                              fontSize: 12,
                              fontFamily: FONT_FAMILY.medium,
                              // color:
                              //   color === "#FFFFFF"
                              //     ? COLORS.dark
                              //     : COLORS.white,
                            }}
                          >
                            {trans.created_at.split(" ")[1]} ● {trans.name}
                          </ThemedText>
                        </View>

                        <ThemedText
                          style={{
                            fontSize: 14,
                            fontFamily: FONT_FAMILY.bold,
                            // color:
                            //   color === "#FFFFFF" ? COLORS.dark : COLORS.white,
                          }}
                        >
                          {formatMoney(trans.amount)} CFA
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                scrollEnabled={false}
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
                      Aucune transaction
                    </ThemedText>
                  </View>
                )}
                // contentContainerStyle={{ gap: 12 }}
              />
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
};

export default DetailBudget;
