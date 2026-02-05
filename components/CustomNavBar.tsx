import { Feather, FontAwesome6 } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import { useLinkBuilder, useTheme } from "@react-navigation/native";
import { useFonts } from "expo-font";
import React from "react";
import { Platform, useColorScheme, View } from "react-native";
import Animated, {
    FadeIn,
    FadeOut,
    LinearTransition,
} from "react-native-reanimated";

const PRIMARY_COLOR = "#265ed7";
const SECONDARY_COLOR = "#E0E0E0";

const AnimatedPressable = Animated.createAnimatedComponent(PlatformPressable);

const CustomNavBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const { colors } = useTheme();
  const { buildHref } = useLinkBuilder();
  const colorScheme = useColorScheme();

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
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colorScheme === "dark" ? SECONDARY_COLOR : "#1a1a1a",
        width: "90%",
        alignSelf: "center",
        position: "absolute",
        bottom: Platform.OS === "android" ? 60 : 40,
        borderRadius: 30,
        padding: 12,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: colorScheme === "dark" ? SECONDARY_COLOR : "#1a1a1a",
        shadowOffset: {
          width: 0,
          height: 5,
        },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <AnimatedPressable
            layout={LinearTransition.springify().mass(0.5)}
            key={route.key}
            // href={buildHref(route.name, route.params)}
            // accessibilityState={isFocused ? { selected: true } : {}}
            // accessibilityLabel={options.tabBarAccessibilityLabel}
            // testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={{
              flexDirection: "row",
              height: 40,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 10,
              backgroundColor: isFocused
                ? colorScheme === "dark"
                  ? "#1a1a1a"
                  : SECONDARY_COLOR
                : "transparent",
              borderRadius: 30,
            }}
          >
            {getIcon(
              route.name,
              isFocused
                ? colorScheme === "dark"
                  ? SECONDARY_COLOR
                  : "#1a1a1a"
                : colorScheme === "dark"
                  ? "#1a1a1a"
                  : SECONDARY_COLOR,
            )}
            {isFocused && (
              <Animated.Text
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={{
                  color: colorScheme === "dark" ? SECONDARY_COLOR : "#1a1a1a",
                  marginLeft: 8,
                  fontFamily: isFocused ? "SemiBold" : "Regular",
                }}
              >
                {label as string}
              </Animated.Text>
            )}
          </AnimatedPressable>
        );

        function getIcon(routeName: string, color: string) {
          switch (routeName) {
            case "index":
              return <Feather name="home" size={24} color={color} />;
            case "budgets":
              return (
                <FontAwesome6
                  name="money-bill-trend-up"
                  size={24}
                  color={color}
                />
              );
            case "stats":
              return <FontAwesome6 name="chart-pie" size={24} color={color} />;
            case "epargne":
              return <FontAwesome6 name="piggy-bank" size={24} color={color} />;
            case "settings":
              return <Feather name="settings" size={24} color={color} />;
          }
        }
      })}
    </View>
  );
};

export default CustomNavBar;
