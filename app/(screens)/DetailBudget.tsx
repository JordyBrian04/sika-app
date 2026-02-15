import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getBudgetDetailByID } from "@/src/db/repositories/budgetRepo";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { AntDesign } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DetailBudget = () => {
  const params = useLocalSearchParams();
  const [detail, setDetail] = React.useState(null);

  const fetchBudgetDetail = async () => {
    console.log("Fetching budget detail for ID:", Number(params.id));
    console.log(await getBudgetDetailByID(Number(params.id)));
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchBudgetDetail();
    }, [params.id]),
  );
  //   console.log("DetailBudget params", params);
  const color = useThemeColor({ light: "#000000", dark: "#FFFFFF" }, "text");
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1, padding: 20 }}>
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
          <View></View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
};

export default DetailBudget;
