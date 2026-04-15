import { COLORS } from "@/components/ui/color";
import { useThemeColor } from "@/hooks/use-theme-color";
import * as React from "react";
import { Dimensions, Keyboard, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Portal } from "react-native-portalize";
import Animated, {
  Extrapolation,
  interpolate,
  runOnUI,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type PropsBottomSheet = {
  children?: React.ReactNode;
};

export type BottomSheetRefProps = {
  scrollTo: (destination: number) => void;
  isActive: () => boolean;
};

const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 50;

const BottomSheet = React.forwardRef<BottomSheetRefProps, PropsBottomSheet>(
  ({ children }, ref) => {
    const color = useThemeColor({ light: "#000000", dark: "#FFFFFF" }, "text");
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const context = useSharedValue({ y: 0 });
    const active = useSharedValue(false);
    const activeJS = React.useRef(false);
    const handleScale = useSharedValue(1);
    /** Track the destination the caller last requested (JS-side) */
    const lastDestination = React.useRef(-500);

    const keyboardHeight = useSharedValue(0);

    React.useEffect(() => {
      const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
        if (active.value) {
          keyboardHeight.value = e.endCoordinates.height;
          const dest = Math.max(
            -SCREEN_HEIGHT / 1.5 - e.endCoordinates.height,
            MAX_TRANSLATE_Y,
          );
          translateY.value = withSpring(dest, { damping: 20, stiffness: 90 });
        }
      });

      const hideSub = Keyboard.addListener("keyboardDidHide", () => {
        if (active.value) {
          keyboardHeight.value = 0;
          // Restore to the caller's last requested position
          translateY.value = withSpring(lastDestination.current, {
            damping: 20,
            stiffness: 90,
          });
        }
      });

      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, []);

    const scrollTo = (destination: number) => {
      "worklet";
      active.value = destination < SCREEN_HEIGHT;
      translateY.value = withSpring(destination, {
        damping: 50,
        stiffness: 200,
      });
    };

    const scrollToJS = React.useCallback((destination: number) => {
      activeJS.current = destination < SCREEN_HEIGHT;
      lastDestination.current = destination;
      runOnUI(scrollTo)(destination);
    }, []);

    const isActive = React.useCallback(() => activeJS.current, []);

    React.useImperativeHandle(ref, () => ({
      scrollTo: scrollToJS,
      isActive,
    }));

    const animatedSheetStyle = useAnimatedStyle(() => ({
      borderRadius: interpolate(
        translateY.value,
        [MAX_TRANSLATE_Y + 50, MAX_TRANSLATE_Y],
        [25, 5],
        Extrapolation.CLAMP,
      ),
      transform: [{ translateY: translateY.value }],
    }));

    // ── Pan gesture ONLY on the handle area ──
    const gesture = Gesture.Pan()
      .onStart(() => {
        context.value = { y: translateY.value };
        handleScale.value = withSpring(1.2, { duration: 100 });
      })
      .onUpdate((event) => {
        translateY.value = Math.max(
          event.translationY + context.value.y,
          MAX_TRANSLATE_Y,
        );
      })
      .onEnd(() => {
        "worklet";
        handleScale.value = withSpring(1, { duration: 150 });
        if (translateY.value > -SCREEN_HEIGHT / 3) {
          scrollTo(SCREEN_HEIGHT);
        } else if (translateY.value < -SCREEN_HEIGHT / 1.5) {
          scrollTo(MAX_TRANSLATE_Y);
        }
      });

    const animatedbackdropStyle = useAnimatedStyle(() => ({
      opacity: withTiming(active.value ? 1 : 0, { duration: 300 }),
    }));

    const animatedhandleStyle = useAnimatedStyle(() => ({
      opacity: withTiming(active.value ? 1 : 0.5, { duration: 300 }),
      transform: [{ scale: handleScale.value }],
    }));

    const animatedbackdropProps = useAnimatedProps(
      () =>
        ({
          pointerEvents: active.value ? "auto" : "none",
        }) as any,
    );

    const styles = StyleSheet.create({
      container: {
        height: SCREEN_HEIGHT,
        width: "100%",
        backgroundColor: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
        position: "absolute",
        top: SCREEN_HEIGHT,
        borderRadius: 25,
        zIndex: 999999,
        elevation: 999999,
      },
      handleZone: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
      },
      line: {
        width: 75,
        height: 4,
        backgroundColor: color === "#FFFFFF" ? COLORS.gray : COLORS.dark,
        borderRadius: 2,
      },
      content: {
        flex: 1,
      },
      backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.5)",
      },
    });

    return (
      <Portal>
        <Animated.View
          onTouchStart={() => scrollToJS(SCREEN_HEIGHT)}
          style={[styles.backdrop, animatedbackdropStyle]}
          animatedProps={animatedbackdropProps}
        />
        <Animated.View style={[styles.container, animatedSheetStyle]}>
          {/* ── Handle: draggable zone ── */}
          <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.handleZone, animatedhandleStyle]}>
              <View style={styles.line} />
            </Animated.View>
          </GestureDetector>

          {/* ── Content: free to scroll & receive text input ── */}
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </Portal>
    );
  },
);

export default BottomSheet;
