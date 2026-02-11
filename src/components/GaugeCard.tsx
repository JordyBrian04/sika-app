import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function GaugeHalfCircle({
  value,
  max,
  level,
}: {
  value: number;
  max: number;
  level: number;
}) {
  const size = 260;
  const stroke = 18;

  const padding = 20;
  const r = size / 2 - stroke - padding;

  const cx = size / 2;
  const cy = size / 2;

  // 🎯 DEMI CERCLE EXACT
  const startAngle = 180;
  const arcAngle = 180;

  const circumference = 2 * Math.PI * r;

  const arcLength = (arcAngle / 360) * circumference;
  const gapLength = circumference - arcLength;

  const progressTarget = useMemo(() => {
    if (max <= 0) return 0;
    return Math.min(1, Math.max(0, value / max));
  }, [value, max]);

  const p = useSharedValue(0);
  const v = useSharedValue(0);

  const [display, setDisplay] = useState(0);

  useEffect(() => {
    p.value = withTiming(progressTarget, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });

    v.value = withTiming(value, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  useAnimatedReaction(
    () => Math.round(v.value),
    (val) => runOnJS(setDisplay)(val),
    [],
  );

  // progression arc
  const arcProps = useAnimatedProps(() => {
    const filled = arcLength * p.value;
    const offset = arcLength - filled;
    return { strokeDashoffset: offset };
  });

  // thumb
  const thumbProps = useAnimatedProps(() => {
    const angleDeg = startAngle + arcAngle * p.value;
    const a = (angleDeg * Math.PI) / 180;

    return {
      cx: cx + r * Math.cos(a),
      cy: cy + r * Math.sin(a),
    };
  });

  return (
    <View style={styles.card}>
      <Svg width={size} height={size / 2 + 20}>
        {/* arc blanc (reste) */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="#E6EAF2"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          rotation={startAngle}
          originX={cx}
          originY={cy}
          strokeDasharray={`${arcLength} ${gapLength}`}
        />

        {/* arc bleu */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={r}
          stroke="#1F4BFF"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          rotation={startAngle}
          originX={cx}
          originY={cy}
          strokeDasharray={`${arcLength} ${gapLength}`}
          animatedProps={arcProps}
        />

        {/* thumb */}
        <AnimatedCircle r={9} fill="#46E3FF" animatedProps={thumbProps} />
      </Svg>

      {/* texte centre */}
      <View style={styles.center}>
        <Text style={styles.value}>{display}</Text>
        <Text style={styles.level}>Niveau {level}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#141824",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
  },
  center: {
    position: "absolute",
    top: 90,
    alignItems: "center",
  },
  value: {
    color: "white",
    fontSize: 44,
    fontWeight: "900",
  },
  level: {
    color: "#9AA3B2",
    marginTop: 4,
    fontSize: 15,
    fontWeight: "600",
  },
});
