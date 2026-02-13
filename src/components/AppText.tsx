import React from "react";
import { StyleProp, Text, TextProps, TextStyle } from "react-native";
import { FONT_FAMILY, FontWeightType } from "../theme/fonts";

type Props = TextProps & {
  weight?: FontWeightType;
  style?: StyleProp<TextStyle>;
};

export default function AppText({
  weight = "regular",
  style,
  ...props
}: Props) {
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: FONT_FAMILY[weight],
        },
        style,
      ]}
    />
  );
}
