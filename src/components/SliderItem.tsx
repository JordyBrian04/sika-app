import { ThemedText } from "@/components/themed-text";
import { COLORS } from "@/components/ui/color";
import { Animated, Dimensions, Easing, Image, Text, View } from "react-native";
import { FONT_FAMILY } from "../theme/fonts";

const { height, width } = Dimensions.get("screen");
export function SliderItem({ item, isActive }: any) {
  const translateYImage: any = new Animated.Value(40);

  Animated.timing(translateYImage, {
    toValue: 0,
    duration: 1000,
    useNativeDriver: false,
    easing: Easing.bounce,
  }).start();

  // console.log(item);

  return (
    <View
      style={[
        {
          alignItems: "flex-start",
          //   marginTop: 60,
          borderWidth: 1,
          borderColor: COLORS.green,
          borderRadius: 20,
          padding: 20,
          width: width - 40,
          backgroundColor: COLORS.green + "10",
          flexDirection: "row",
          gap: 20,
        },
      ]}
    >
      <View
        style={{
          padding: 10,
          backgroundColor: COLORS.green + "30",
          borderRadius: 12,
        }}
      >
        <Image
          source={require("../../assets/images/cognitive.png")}
          style={{ width: 30, height: 30 }}
          tintColor={COLORS.green}
        />
      </View>

      <View style={{ flex: 1, gap: 5 }}>
        <Text
          style={{
            fontFamily: FONT_FAMILY.semibold,
            fontSize: 16,
            color: COLORS.green,
          }}
        >
          OBSERVATION
        </Text>
        <ThemedText style={{ fontFamily: FONT_FAMILY.regular, fontSize: 13 }}>
          {item.observation}
        </ThemedText>

        <View
          style={{
            height: 1,
            backgroundColor: COLORS.green + "30",
            // marginVertical: 10,
          }}
        />

        <Text
          style={{
            fontFamily: FONT_FAMILY.semibold,
            fontSize: 16,
            color: COLORS.green,
          }}
        >
          RECOMMANDATION
        </Text>
        <ThemedText style={{ fontFamily: FONT_FAMILY.regular, fontSize: 13 }}>
          {item.recommendation}
        </ThemedText>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 20,
            marginTop: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Image
              source={require("../../assets/images/shield.png")}
              style={{ width: 30, height: 30 }}
              tintColor={COLORS.green}
            />
            <View>
              <ThemedText
                style={{ fontFamily: FONT_FAMILY.regular, fontSize: 13 }}
              >
                Confiance
              </ThemedText>
              <Text
                style={{
                  fontFamily: FONT_FAMILY.bold,
                  fontSize: 13,
                  color: COLORS.green,
                }}
              >
                {item.confidence} %
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Image
              source={require("../../assets/images/target.png")}
              style={{ width: 30, height: 30 }}
              tintColor={COLORS.green}
            />
            <View>
              <ThemedText
                style={{ fontFamily: FONT_FAMILY.regular, fontSize: 13 }}
              >
                Impact
              </ThemedText>
              <Text
                style={{
                  fontFamily: FONT_FAMILY.bold,
                  fontSize: 13,
                  color: COLORS.green,
                }}
              >
                {item.impact} %
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
