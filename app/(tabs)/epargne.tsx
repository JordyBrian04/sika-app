import { ThemedView } from "@/components/themed-view";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { color } from "@/src/utils/colos";
import React from "react";
import { Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TabFourScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={{ flex: 1 }}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 20, gap: 22 }}
        >
          <Text
            style={{
              fontFamily: FONT_FAMILY.bold,
              fontSize: 35,
              color: color,
            }}
          >
            Objectifs et épargnes
          </Text>

          {/* Mission */}
          <View></View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}
