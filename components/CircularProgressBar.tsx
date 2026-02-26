import { FONT_FAMILY } from "@/src/theme/fonts";
import { color } from "@/src/utils/colos";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { Text, View } from "react-native";
import { COLORS } from "./ui/color";

type Props = {
  radius: number;
  strokeWidth: number;
  percentage: number;
  end: number;
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

  // console.log(
  //   "Rendering CircularProgressBar with percentage:",
  //   percentage,
  //   "and end:",
  //   end,
  // );

  const targetText = `${Math.round(percentage)}%`;

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
      <View
        style={{
          position: "absolute",
          top: radius === 70 ? 50 : 30,
          left: radius === 70 ? 40 : 30,
        }}
      >
        <Text
          style={{
            color: color,
            fontSize: radius === 70 ? 28 : 20,
            fontFamily: FONT_FAMILY.bold,
          }}
        >
          {Math.round(percentage)}%
        </Text>
      </View>
    </View>
  );
};

export default CircularProgressBar;
