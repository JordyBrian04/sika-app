import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import { getUserProfile, UserProfile } from "@/src/db/repositories/userRepo";
import { getConstante } from "@/src/services/AsyncStorage";
import { AntDesign } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function HomeScreen() {
  const [user, setUser] = useState<UserProfile[]>([]);
  const [showBudget, setShowBudget] = useState(false);

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
    // <SafeAreaView style={{ flex: 1 }}>
    <ThemedView style={{ flex: 1, gap: 22 }}>
      {/* <ScrollView style={{ flex: 1, gap: 22, flexDirection: "column" }}> */}
      <View
        style={{
          backgroundColor: COLORS.primary,
          padding: 16,
          paddingTop: 40,
        }}
      >
        <Text style={{ fontFamily: "Regular", fontSize: 21, color: "#fff" }}>
          Bienvenue,{" "}
          <Text style={{ fontFamily: "Bold", fontSize: 21, color: "#fff" }}>
            {user?.[0]?.name}
          </Text>
        </Text>
        <View style={{ marginTop: 12 }}>
          <Text
            style={{
              fontFamily: "BoldItalic",
              fontSize: 13,
              textAlign: "right",
              color: "#fff",
            }}
          >
            "La liberté financière commence par la sensibilisation et la
            discipline."
          </Text>
        </View>

        <View style={{ marginTop: 30 }}>
          <Text style={{ fontFamily: "Regular", fontSize: 15, color: "#fff" }}>
            Budget du mois
          </Text>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontFamily: "Bold", fontSize: 30, color: "#fff" }}>
              165 000 CFA
            </Text>
            <AntDesign name="eye" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      {/* </ScrollView> */}
    </ThemedView>
    //</SafeAreaView>
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
