import { COLORS } from "@/components/ui/color";
import { Animated, Dimensions, View } from "react-native";

const { width } = Dimensions.get("screen");

export function Pagination({ datas, scrollX, idx }: any) {
  return (
    <View
      style={{
        position: "absolute",
        bottom: -40,
        flexDirection: "row",
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {datas.map((_: any, index: any) => {
        // console.log(index, idx)
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [12, 30, 12],
          extrapolate: "clamp",
        });

        const backgroundColor = scrollX.interpolate({
          inputRange,
          outputRange: ["#ccc", "#000", "#ccc"],
          extrapolate: "clamp",
        });

        return (
          <Animated.View
            key={index.toString()}
            style={[
              {
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: "#ccc",
                marginHorizontal: 3,
              },
              { width: dotWidth, backgroundColor },
              index === idx && { backgroundColor: COLORS.secondary },
            ]}
          ></Animated.View>
        );
      })}
    </View>
  );
}
