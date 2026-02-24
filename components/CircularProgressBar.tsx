import { FONT_FAMILY } from "@/src/theme/fonts";
import { color } from "@/src/utils/colos";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { Text, View } from "react-native";
import { SharedValue, useDerivedValue } from "react-native-reanimated";
import { COLORS } from "./ui/color";

type Props = {
  radius: number;
  strokeWidth: number;
  percentage: SharedValue<number>;
  end: SharedValue<number>;
};

const CircularProgressBar = ({
  radius,
  strokeWidth,
  percentage,
  end,
}: Props) => {
  const innerRadius = radius - strokeWidth / 2;
  const path = Skia.Path.Make();
  path.addCircle(radius, radius, innerRadius);

  const targetText = useDerivedValue(
    () => `${Math.round(percentage.value)}%`,
    [],
  );

  return (
    <View
      style={{
        width: radius * 2,
        height: radius * 2,
        // flex: 1,
        // alignItems: "center",
        // justifyContent: "center",
      }}
    >
      <Canvas style={{ flex: 1 }}>
        <Path
          path={path}
          strokeWidth={strokeWidth}
          style={"stroke"}
          color={"#333438"}
          strokeJoin={"round"}
          strokeCap={"round"}
          start={0}
          end={1}
        />
        <Path
          path={path}
          strokeWidth={strokeWidth}
          style={"stroke"}
          color={COLORS.green}
          strokeJoin={"round"}
          strokeCap={"round"}
          start={0}
          end={end}
        />
      </Canvas>
      <View style={{ position: "absolute", top: 30, left: 30 }}>
        <Text
          style={{ color: color, fontSize: 20, fontFamily: FONT_FAMILY.bold }}
        >
          {Math.round(percentage.value)}%
        </Text>
      </View>
    </View>
  );
};

export default CircularProgressBar;
