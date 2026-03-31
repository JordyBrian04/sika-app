import { ThemedText } from "@/components/themed-text";
import { COLORS } from "@/components/ui/color";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Alert, Image, Pressable, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { FONT_FAMILY } from "../theme/fonts";
import { formatMoney } from "../utils/format";

const ACTION_WIDTH = 80;
const MAX_LEFT_SWIPE = ACTION_WIDTH * 2;
const MAX_RIGHT_SWIPE = ACTION_WIDTH;

// N'oubliez pas de passer les props nécessaires (router, color, etc.)
const SwipeableTransaction = ({ trans, router, color }: any) => {
  // 1. Chaque ligne a maintenant sa propre valeur partagée
  const SwipeAnimatedValue = useSharedValue(0);

  // 2. Chaque ligne a son propre style animé
  const SwipeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: SwipeAnimatedValue.value }],
    };
  });

  const SEUIL_OUVERTURE = -MAX_LEFT_SWIPE / 2;

  // 3. Chaque ligne a son propre détecteur de mouvement
  //    activeOffsetX : le pan ne s'active qu'après 15px horizontaux
  //    failOffsetY   : le pan échoue (= laisse le scroll vertical) si
  //                    le doigt bouge de plus de 10px verticalement d'abord
  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onBegin(() => {})
    .onUpdate((event) => {
      SwipeAnimatedValue.value = Math.min(
        0,
        Math.max(-MAX_LEFT_SWIPE, event.translationX),
      );
    })
    .onEnd(() => {
      if (SwipeAnimatedValue.value < SEUIL_OUVERTURE) {
        SwipeAnimatedValue.value = withSpring(-MAX_LEFT_SWIPE, {
          damping: 20,
          stiffness: 90,
        });
      } else {
        SwipeAnimatedValue.value = withSpring(0, {
          damping: 20,
          stiffness: 90,
        });
      }
    });

  // Fonction utilitaire pour l'icône (extraite pour la lisibilité)
  const getIcon = (categoryName: any) => {
    const name = categoryName?.toLowerCase() || "";
    if (name.includes("alimentation"))
      return require("../../assets/images/diet.png");
    if (name.includes("transport"))
      return require("../../assets/images/transportation.png");
    if (name.includes("facture"))
      return require("../../assets/images/bill.png");
    if (name.includes("abonnement"))
      return require("../../assets/images/membership.png");
    if (name.includes("sante")) return require("../../assets/images/pills.png");
    if (name.includes("loisirs"))
      return require("../../assets/images/theater.png");
    if (name.includes("salaire"))
      return require("../../assets/images/payroll.png");
    if (name.includes("depart"))
      return require("../../assets/images/salary.png");
    if (name.includes("facture"))
      return require("../../assets/images/bill.png");
    if (name.includes("mission"))
      return require("../../assets/images/mission.png");
    if (name.includes("famille"))
      return require("../../assets/images/big-family.png");
    if (name.includes("education"))
      return require("../../assets/images/stack-of-books.png");
    if (name.includes("shopping"))
      return require("../../assets/images/online-shopping.png");
    if (name.includes("téléphone/internet"))
      return require("../../assets/images/iphone.png");
    if (name.includes("soin"))
      return require("../../assets/images/lotions.png");
    return require("../../assets/images/shapes.png");
  };

  return (
    <View style={{ flex: 1, position: "relative" }}>
      <View
        style={{
          //   height: 70,
          width: MAX_LEFT_SWIPE,
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 8,
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: ACTION_WIDTH,
            height: 70,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgb(255,70,70)",
          }}
        >
          <TouchableOpacity>
            <MaterialIcons name="delete" size={30} color="white" />
          </TouchableOpacity>
        </View>
        <View
          style={{
            width: ACTION_WIDTH,
            height: 70,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: COLORS.primary,
            borderTopRightRadius: 10,
            borderBottomRightRadius: 10,
          }}
        >
          <TouchableOpacity>
            <Feather name="edit" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[SwipeAnimatedStyle, { width: "100%" }]}>
          <Pressable
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              alignItems: "center",
              backgroundColor:
                color === "#FFFFFF" ? COLORS.dark : COLORS.secondary,
              padding: 10,
              borderRadius: 8,
              marginBottom: 8,
            }}
            onPress={() =>
              router.push({
                pathname: "/(screens)/DetailTransactions",
                params: { ...trans, name: trans.category_name },
              })
            }
            onLongPress={() =>
              Alert.alert(
                "Suppression",
                "Voulez-vous vraiment supprimer cette transaction ?",
                [
                  { text: "Oui", style: "destructive" },
                  { text: "Non", style: "cancel" },
                ],
              )
            }
          >
            {/* Section Icône */}
            <View
              style={
                {
                  /* vos styles d'icône */
                }
              }
            >
              <Image
                source={getIcon(trans.category_name)}
                style={{ width: 30, height: 30 }}
              />
            </View>

            {/* Section Texte */}
            <View style={{ width: 170, gap: 4 }}>
              <ThemedText
                style={{ fontSize: 14, fontFamily: FONT_FAMILY.semibold }}
                numberOfLines={1}
              >
                {trans.note}
              </ThemedText>
              <ThemedText
                style={{ fontSize: 12, fontFamily: FONT_FAMILY.medium }}
              >
                {trans.created_at.split(" ")[1]}
                {/* ● {trans.category_name} */}
              </ThemedText>
            </View>

            {/* Section Montant */}
            <ThemedText
              style={{ fontSize: 14, fontFamily: FONT_FAMILY.semibold }}
            >
              {formatMoney(trans.amount)} CFA
            </ThemedText>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

export default SwipeableTransaction;
