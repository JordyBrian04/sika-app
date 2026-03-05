import { AntDesign } from "@expo/vector-icons";
import React, { FC } from "react";
import Animated, {
    SharedValue,
    useAnimatedStyle,
    withTiming,
} from "react-native-reanimated";
import { color } from "../utils/colos";

type ArrowButtonProps = {
  progress: Readonly<SharedValue<0 | 1>>;
};

const Button: FC<ArrowButtonProps> = ({ progress }) => {
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${progress.value * -180}deg` },
      { scale: withTiming(progress.value === 1 ? 1.2 : 1, { duration: 200 }) },
    ],
    opacity: withTiming(progress.value === 1 ? 1 : 0.8, { duration: 200 }),
  }));

  return (
    <Animated.View
      style={[{ justifyContent: "center", alignItems: "center" }, iconStyle]}
    >
      <AntDesign name="down" size={17} color={color} />
    </Animated.View>
  );
};

export default Button;
