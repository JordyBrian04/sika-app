import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import * as Haptics from "expo-haptics";
import * as LocalAuthentification from "expo-local-authentication";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const Page = () => {
  const [code, setCode] = useState<number[]>([]);
  const codeLength = Array(6).fill(0);
  const router = useRouter();
  const offset = useSharedValue(0);

  const style = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: offset.value }],
    };
  });

  const color = useThemeColor({ light: "#000000", dark: "#FFFFFF" }, "text");

  const OFFSET = 10;
  const TIME = 80;

  useEffect(() => {
    if (code.length === 6) {
      if (code.join("") === "123456") {
        router.navigate("/(tabs)");
        setCode([]);
      } else {
        offset.value = withSequence(
          withTiming(-OFFSET, { duration: TIME / 2 }),
          withRepeat(withTiming(OFFSET, { duration: TIME }), 4, true),
          withTiming(0, { duration: TIME / 2 }),
        );

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setCode([]);
      }
    }
  }, [code]);

  const onNumberPress = (num: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCode((prev) => [...prev, num]);
  };

  const numberBackspace = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCode((prev) => prev.slice(0, -1));
  };

  const onBiometricPress = async () => {
    const { success } = await LocalAuthentification.authenticateAsync();
    if (success) {
      router.navigate("/(tabs)");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const [fontLoaded] = useFonts({
    Bold: require("../assets/fonts/Poppins-Bold.ttf"),
    BoldItalic: require("../assets/fonts/Poppins-BoldItalic.ttf"),
    SemiBold: require("../assets/fonts/Poppins-SemiBold.ttf"),
    Regular: require("../assets/fonts/Poppins-Regular.ttf"),
  });

  if (!fontLoaded) {
    return undefined;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <ThemedText type="title" style={{ fontFamily: "Bold" }}>
          Bienvenue Jordy Brian!
        </ThemedText>

        <Animated.View
          style={[
            {
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 20,
              marginVertical: 100,
            },
            style,
          ]}
        >
          {codeLength.map((_, index) => (
            <ThemedView
              key={index}
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: code[index] ? "rgb(77, 81, 77)" : "#D8DCE2",
                // borderWidth: 1,
                // borderColor: "gray",
                // margin: 10,
                // justifyContent: "center",
                // alignItems: "center",
              }}
            ></ThemedView>
          ))}
        </Animated.View>

        <ThemedView style={{ gap: 50 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              width: 300,
            }}
          >
            {[1, 2, 3].map((num) => (
              <TouchableOpacity
                key={num}
                style={{
                  borderWidth: 1,
                  borderColor: "gray",
                  borderRadius: 100,
                  padding: 10,
                  width: 60,
                  height: 60,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={() => onNumberPress(num)}
              >
                <ThemedText style={{ fontSize: 22, fontFamily: "Regular" }}>
                  {num}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              width: 300,
            }}
          >
            {[4, 5, 6].map((num) => (
              <TouchableOpacity
                key={num}
                style={{
                  borderWidth: 1,
                  borderColor: "gray",
                  borderRadius: 100,
                  padding: 10,
                  width: 60,
                  height: 60,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={() => onNumberPress(num)}
              >
                <ThemedText style={{ fontSize: 22, fontFamily: "Regular" }}>
                  {num}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              width: 300,
            }}
          >
            {[7, 8, 9].map((num) => (
              <TouchableOpacity
                key={num}
                style={{
                  borderWidth: 1,
                  borderColor: "gray",
                  borderRadius: 100,
                  padding: 10,
                  width: 60,
                  height: 60,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={() => onNumberPress(num)}
              >
                <ThemedText style={{ fontSize: 22, fontFamily: "Regular" }}>
                  {num}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              width: 300,
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              style={{
                padding: 10,
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={onBiometricPress}
            >
              <MaterialCommunityIcons
                name="face-recognition"
                size={24}
                color={color}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                borderWidth: 1,
                borderColor: "gray",
                borderRadius: 100,
                padding: 10,
                width: 60,
                height: 60,
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={() => onNumberPress(0)}
            >
              <ThemedText style={{ fontSize: 22, fontFamily: "Regular" }}>
                0
              </ThemedText>
            </TouchableOpacity>

            <View
              style={{
                minWidth: 30,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {code.length > 0 && (
                <TouchableOpacity onPress={numberBackspace}>
                  <Feather name="delete" size={24} color={color} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ThemedView>
      </ThemedView>
    </SafeAreaView>
  );
};

export default Page;
