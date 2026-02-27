import { ThemedText } from "@/components/themed-text";
import { COLORS } from "@/components/ui/color";
import React from "react";
import { View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { FONT_FAMILY } from "../theme/fonts";
import { color } from "../utils/colos";

export default function PieChartRender({ datas }: any) {
  const [focusedIndex, setFocusedIndex] = React.useState(
    datas.find((item: any) => item.focused === true),
  );

  console.log(focusedIndex);

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

  const renderLegendComponent = () => {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        {datas.map((item: any, index: number) => (
          <View
            key={index}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 5,
            }}
          >
            {renderDot(item.color)}
            <ThemedText style={{ fontSize: 14 }}>
              {item.label} : {item.value}%
            </ThemedText>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <PieChart
        data={datas}
        donut
        // showGradient
        sectionAutoFocus
        radius={90}
        innerRadius={60}
        innerCircleColor={color === "#FFFFFF" ? COLORS.dark : COLORS.white}
        centerLabelComponent={() => {
          return (
            <View style={{ justifyContent: "center", alignItems: "center" }}>
              <ThemedText
                style={{ fontSize: 22, color: "white", fontWeight: "bold" }}
              >
                {focusedIndex ? `${focusedIndex.value}%` : ""}
              </ThemedText>
              <ThemedText
                style={{
                  fontSize: 12,
                  color: "white",
                  textAlign: "center",
                  fontFamily: FONT_FAMILY.regular,
                }}
              >
                {focusedIndex ? focusedIndex.label : ""}
              </ThemedText>
            </View>
          );
        }}
        focusOnPress
        onPress={(item: any) => setFocusedIndex(item)}
      />
      {renderLegendComponent()}
    </View>
  );
}
