import * as React from "react";
import { Dimensions, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Portal } from "react-native-portalize";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
    const translateY = useSharedValue(SCREEN_HEIGHT);
    // const translateY = useSharedValue(0);
    const context = useSharedValue({ y: 0 });
    // const MAX_TRANSLATE_Y = SCREEN_HEIGHT * 0.15;
    const active = useSharedValue(false);
    const handleScale = useSharedValue(1);

    const keyboardHeight = useSharedValue(0);

    // React.useEffect(() => {
    //   const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
    //     keyboardHeight.value = e.endCoordinates.height;
    //     translateY.value = withSpring(
    //       MAX_TRANSLATE_Y - e.endCoordinates.height,
    //     );
    //   });

    //   const hideSub = Keyboard.addListener("keyboardDidHide", () => {
    //     keyboardHeight.value = 0;
    //     translateY.value = withSpring(MAX_TRANSLATE_Y);
    //   });

    //   return () => {
    //     showSub.remove();
    //     hideSub.remove();
    //   };
    // }, []);

    const scrollTo = React.useCallback((destination: number) => {
      // console.log("destination", destination);
      ("worklet");
      const finalDestination = destination === 0 ? 100 : destination;
      // active.value = destination !== 0;
      active.value = destination < SCREEN_HEIGHT;
      translateY.value = withSpring(destination, {
        damping: 50,
        stiffness: 200,
      });
    }, []);

    const isActive = React.useCallback(() => {
      return active.value;
    }, []);

    React.useImperativeHandle(ref, () => ({ scrollTo, isActive }), [
      scrollTo,
      isActive,
    ]);

    const animatedSheetStyle = useAnimatedStyle(() => {
      return {
        borderRadius: interpolate(
          translateY.value,
          [MAX_TRANSLATE_Y + 50, MAX_TRANSLATE_Y],
          [25, 5],
          Extrapolation.CLAMP,
        ),
        transform: [{ translateY: translateY.value }],
      };
    });

    const gesture = Gesture.Pan()
      .onStart(() => {
        context.value = { y: translateY.value };
        handleScale.value = withSpring(1.2, { duration: 100 });
      })
      .onUpdate((event) => {
        // translateY.value = event.translationY + context.value.y;
        // translateY.value = Math.max(translateY.value, MAX_TRANSLATE_Y);
        translateY.value = Math.max(
          event.translationY + context.value.y,
          MAX_TRANSLATE_Y,
        );
      })
      .onEnd(() => {
        handleScale.value = withSpring(1, { duration: 150 });
        if (translateY.value > -SCREEN_HEIGHT / 3) {
          // scrollTo(0);
          scrollTo(SCREEN_HEIGHT);
        } else if (translateY.value < -SCREEN_HEIGHT / 1.5) {
          scrollTo(MAX_TRANSLATE_Y);
        }
      });

    const rBottomSheetStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateY: translateY.value }],
      };
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

    // React.useEffect(() => {
    //     scrollTo(-SCREEN_HEIGHT/3)
    // }, [])
    return (
      <Portal>
        <Animated.View
          onTouchStart={() => scrollTo(SCREEN_HEIGHT)}
          style={[styles.backdrop, animatedbackdropStyle]}
          animatedProps={animatedbackdropProps}
        />
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.container, animatedSheetStyle]}>
            <Animated.View style={[styles.line, animatedhandleStyle]} />
            {children}
          </Animated.View>
        </GestureDetector>
      </Portal>
    );
  },
);

export default BottomSheet;

const styles = StyleSheet.create({
  container: {
    height: SCREEN_HEIGHT,
    width: "100%",
    backgroundColor: "#F5F5F5",
    // backgroundColor:'#efefef',
    position: "absolute",
    top: SCREEN_HEIGHT,
    borderRadius: 25,
    zIndex: 999999,
    elevation: 999999,
  },
  line: {
    width: 75,
    height: 4,
    backgroundColor: "grey",
    borderRadius: 2,
    marginVertical: 15,
    alignSelf: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
});
