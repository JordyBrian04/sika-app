import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useModalQueue } from "@/src/ui/components/useModalQueue";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import * as Haptics from "expo-haptics";
import * as LocalAuthentification from "expo-local-authentication";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createOrUpdateUserProfile,
  getUserProfile,
  UserProfile,
} from "../src/db/repositories/userRepo";

const Page = () => {
  const [code, setCode] = useState<number[]>([]);
  const [userInput, setUserInput] = useState({
    name: "",
    gender: "male",
  });
  const codeLength = Array(6).fill(0);
  const MAX = codeLength.length;
  const router = useRouter();
  const offset = useSharedValue(0);
  const { openModal, closeModal, isVisible } = useModalQueue();
  const [loading, setLoading] = useState(false);

  const style = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: offset.value }],
    };
  });

  const genre = [
    { label: "Homme", value: "male" },
    { label: "Femme", value: "female" },
  ];

  const [user, setUser] = useState<UserProfile[]>([]);

  const refresh = async () => {
    // await deleteUserProfile();
    console.log(await getUserProfile());
    setUser((await getUserProfile()) ?? []);
  };

  useEffect(() => {
    refresh();
  }, []);

  const color = useThemeColor({ light: "#000000", dark: "#FFFFFF" }, "text");

  const OFFSET = 10;
  const TIME = 80;

  useEffect(() => {
    if (code.length === 6 && user.length > 0) {
      if (code.join("") === user[0].pass) {
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
    setCode((prev) => (prev.length >= MAX ? prev : [...prev, num]));
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

  const handleValidate = async () => {
    if (userInput.name.trim().length === 0)
      return alert("Le nom ne peut pas être vide.");

    setLoading(true);
    await createOrUpdateUserProfile(
      code.join(""),
      userInput.name.trim(),
      userInput.gender.trim(),
    )
      .then(() => {
        router.navigate("/(tabs)");
        closeModal();
      })
      .catch((e) => {
        console.error("Error creating/updating user profile", e);
        alert("Une erreur est survenue. Veuillez réessayer.");
      })
      .finally(() => setLoading(false));
  };

  function nameModal() {
    return (
      <Modal
        visible={isVisible("nameModal")}
        animationType="fade"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          >
            <ThemedView
              style={{
                borderRadius: 10,
                padding: 20,
                width: "100%",
                position: "absolute",
                bottom: 0,
                gap: 22,
                paddingBottom: 70,
              }}
            >
              <View>
                <ThemedText
                  style={{ fontFamily: "SemiBold", color: color, fontSize: 18 }}
                >
                  Entrez votre nom
                </ThemedText>
                <TextInput
                  placeholder="Nom complet"
                  style={{
                    borderWidth: 1,
                    borderColor: "gray",
                    borderRadius: 10,
                    padding: 12,
                    marginTop: 10,
                    color: color,
                  }}
                  onChangeText={(text) =>
                    setUserInput((prev) => ({ ...prev, name: text }))
                  }
                  value={userInput.name}
                  autoCapitalize="words"
                />
              </View>

              <View>
                <ThemedText
                  style={{ fontFamily: "SemiBold", color: color, fontSize: 18 }}
                >
                  Genre
                </ThemedText>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  {genre.map((g) => (
                    <TouchableOpacity
                      key={g.value}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        marginTop: 10,
                      }}
                      onPress={() =>
                        setUserInput((prev) => ({ ...prev, gender: g.value }))
                      }
                    >
                      <Text> </Text>
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: color,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {userInput.gender === g.value && (
                          <View
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 6,
                              backgroundColor: color,
                            }}
                          />
                        )}
                      </View>
                      <ThemedText
                        style={{ fontFamily: "Regular", color: color }}
                      >
                        {g.label}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={{
                  padding: 12,
                  backgroundColor: color,
                  borderRadius: 10,
                  alignItems: "center",
                  opacity: loading ? 0.7 : 1,
                }}
                onPress={handleValidate}
                disabled={loading}
              >
                <ThemedText
                  style={{
                    fontFamily: "SemiBold",
                    color: color === "#FFFFFF" ? "#000000" : "#FFFFFF",
                  }}
                >
                  {loading ? (
                    <ActivityIndicator
                      color={color === "#FFFFFF" ? "#000000" : "#FFFFFF"}
                    />
                  ) : (
                    "Enregistrer"
                  )}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

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
          {user.length > 0
            ? `Bienvenue ${user[0].name}!`
            : "Créez un nouveau code"}
          {/* Bienvenue {user.length > 0 ? user[0].name : "Jordy Brian"}! */}
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
          {codeLength.map((_, index) => {
            // console.log(code, index, code[index]);
            return (
              <ThemedView
                key={index}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor:
                    index < code.length ? "rgb(77, 81, 77)" : "#D8DCE2",
                  // borderWidth: 1,
                  // borderColor: "gray",
                  // margin: 10,
                  // justifyContent: "center",
                  // alignItems: "center",
                }}
              ></ThemedView>
            );
          })}
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
            <View style={{ minWidth: 30 }}>
              {user.length > 0 && (
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
              )}
            </View>

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

        <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
          <TouchableOpacity
            onPress={() => (user.length > 0 ? null : openModal("nameModal"))}
          >
            <ThemedText
              style={{ fontSize: 16, fontFamily: "Regular", color: color }}
            >
              {user.length > 0
                ? "Code oublié ?"
                : code.length === 6
                  ? "Enregistrer le code"
                  : ""}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
      {nameModal()}
    </SafeAreaView>
  );
};

export default Page;
