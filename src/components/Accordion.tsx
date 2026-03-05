import { ThemedText } from "@/components/themed-text";
import { COLORS } from "@/components/ui/color";
import { useThemeColor } from "@/hooks/use-theme-color";
import React, { FC } from "react";
import { LayoutChangeEvent, TouchableOpacity, View } from "react-native";
import Animated, {
  measure,
  runOnUI,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Category } from "../utils/constants";
import { formatMoney } from "../utils/format";
import Button from "./Button";

interface AccordionProps {
  categorie: Category;
  onAccordionOpen?: (layoutY: number, contentHeight: number) => void;
}

const Accordion: FC<AccordionProps> = ({ categorie, onAccordionOpen }) => {
  const color = useThemeColor({ light: "#000000", dark: "#FFFFFF" }, "text");
  const contentRef = useAnimatedRef<View>();
  const contentHeight = useSharedValue(0);
  const isOpen = useSharedValue(false);

  const contentAnimationStyle = useAnimatedStyle(() => ({
    height: contentHeight.value,
    opacity: withTiming(isOpen.value ? 1 : 0, { duration: 300 }),
  }));

  const headerScaleAnimation = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(isOpen.value ? 1 : 0.95),
      },
      {
        translateY: withDelay(150, withSpring(isOpen.value ? -5 : 0)),
      },
    ],
  }));

  const fadeInStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isOpen.value ? 1 : 0, { duration: 300 }),
  }));

  const toggleAccordion = () => {
    if (!isOpen.value) {
      runOnUI(() => {
        "worklet";
        const measuredHeight = measure(contentRef)?.height || 0;
        contentHeight.value = withTiming(measuredHeight, { duration: 300 });
      })();
      isOpen.value = true;
    } else {
      contentHeight.value = withTiming(0, { duration: 300 });
      isOpen.value = false;
    }
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    if (isOpen.value && onAccordionOpen) {
      const { y, height } = event.nativeEvent.layout;
      onAccordionOpen(y, height);
    }
  };

  const getDayName = (dateString: any) => {
    const days = [
      "Dimanche",
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
    ];
    const date = new Date(dateString);
    return days[date.getDay()];
  };

  const formatHeure = (date: string) => {
    const NewDate = new Date(date.replace(" ", "T"));
    return NewDate.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const rotation = useDerivedValue(() =>
    isOpen.value
      ? withTiming(1, { duration: 300 })
      : withTiming(0, { duration: 300 }),
  );

  const Maj = (string: string) => {
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const formattedCap = capitalize(string);

    return formattedCap;
  };

  const renderDot = (color: any) => {
    return (
      <View
        style={{
          height: 10,
          width: 10,
          borderRadius: 5,
          backgroundColor: color,
          marginRight: 10,
        }}
      />
    );
  };

  return (
    <View
      onLayout={handleLayout}
      style={{
        backgroundColor: color === "#FFFFFF" ? COLORS.noir : COLORS.secondary,
        marginHorizontal: 0,
        marginVertical: 0,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <TouchableOpacity
        onPress={() => toggleAccordion()}
        style={{
          padding: 20,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <ThemedText
          style={{
            fontFamily: "SemiBold",
            // color: "black",
            fontSize: 16,
            flexWrap: "wrap",
            width: "90%",
          }}
        >
          {Maj(categorie.titre)}
        </ThemedText>
        <Button progress={rotation} />
      </TouchableOpacity>
      <Animated.View style={[contentAnimationStyle, fadeInStyle]}>
        <Animated.View
          ref={contentRef}
          style={{ position: "absolute", width: "100%", top: 0 }}
        >
          <View
            style={{
              width: "95%",
              height: 2,
              backgroundColor: COLORS.gray,
              borderRadius: 15,
              alignSelf: "center",
            }}
          />
          <View
            style={{
              backgroundColor:
                color === "#FFFFFF" ? COLORS.noir : COLORS.secondary,
              padding: 20,
            }}
          >
            <Animated.View style={[{ marginTop: 10 }, headerScaleAnimation]}>
              {categorie.content &&
                [...categorie.content]
                  .sort((a, b) => b.amount - a.amount)
                  .map((item, index) => (
                    <View
                      key={index}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 5,
                        justifyContent: "flex-start",
                      }}
                    >
                      {renderDot(item.color)}
                      <ThemedText style={{ fontSize: 14 }}>
                        {item.label} : {formatMoney(item.amount)} CFA soit{" "}
                        {item.value}%
                      </ThemedText>
                    </View>
                  ))}
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export default Accordion;
