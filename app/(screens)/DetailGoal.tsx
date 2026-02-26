import CircularProgressBar from "@/components/CircularProgressBar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import ProgressBar from "@/src/components/ProgressBar";
import { getGoal, weeklyHistory } from "@/src/services/goals/goalsRepo";
import {
    getDelayDaysFromExpenseUsingPlan,
    getGoalProjection,
    getGoalProjectionClean,
    getGoalSavingSpeed,
} from "@/src/services/goals/insights";
import { getGoalPlan } from "@/src/services/goals/planner";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { color } from "@/src/utils/colos";
import { formatMoney } from "@/src/utils/format";
import { AntDesign, FontAwesome, Fontisto, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
    Dimensions,
    Image,
    ScrollView,
    Text,
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
    setGoalDetails(await getGoalPlan(id as any));
    console.log("goalDetails", await getGoalPlan(id as any));

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
    console.log("weeklyContribution", fullWeeklyHistory);

    setGoalProjections(await getGoalProjection(id as any));

    console.log("getGoalSavingSpeed ", await getGoalSavingSpeed(id as any));
    console.log("getGoalProjection ", await getGoalProjection(id as any));
    console.log(
      "getGoalProjectionClean ",
      await getGoalProjectionClean(id as any),
    );
    console.log(
      "getDelayDaysFromExpenseUsingPlan ",
      await getDelayDaysFromExpenseUsingPlan(
        id as any,
        goalDetails?.saved_amount,
      ),
    );
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
                    fontSize: 16,
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
                    fontSize: 14,
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
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
};

export default DetailGoal;
