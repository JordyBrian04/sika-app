import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getUserProfile, UserProfile } from "@/src/db/repositories/userRepo";
import { getConstante } from "@/src/services/AsyncStorage";
import { useFonts } from "expo-font";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const [user, setUser] = useState<UserProfile[]>([]);
  const [showBudget, setShowBudget] = useState(false);
  const color = useThemeColor({ light: "#000000", dark: "#FFFFFF" }, "text");

  const getUser = async () => {
    console.log(await getUserProfile());
    setUser((await getUserProfile()) ?? []);
  };

  const getConstant = async () => {
    const res = await getConstante("show_budget");
    console.log("show_budget", res);
    setShowBudget(res === "enabled");
  };

  useEffect(() => {
    getUser();
    getConstant();
  }, []);

  const [fontLoaded] = useFonts({
    Bold: require("../../assets/fonts/Poppins-Bold.ttf"),
    BoldItalic: require("../../assets/fonts/Poppins-BoldItalic.ttf"),
    SemiBold: require("../../assets/fonts/Poppins-SemiBold.ttf"),
    Regular: require("../../assets/fonts/Poppins-Regular.ttf"),
  });

  if (!fontLoaded) {
    return undefined;
  }
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={{ flex: 1, gap: 22 }} lightColor={COLORS.secondary}>
        <ScrollView
          style={{ flex: 1, gap: 22, flexDirection: "column", padding: 10 }}
        >
          <View>
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

            <View>
              <ThemedText style={{ fontFamily: "Regular", fontSize: 14 }}>
                Bienvenue, {user[0]?.name}
              </ThemedText>
              <Image
                source={
                  user[0]?.gender === "male"
                    ? require("../../assets/images/boy.png")
                    : require("../../assets/images/woman.png")
                }
                style={{ width: 40, height: 40 }}
              />
            </View>
          </View>
        </ScrollView>
      </ThemedView>
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
