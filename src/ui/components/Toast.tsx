import { useEffect } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useToastStore } from "../../state/toastStore";

export default function Toast() {
  const { visible, message, sub, kind, hide } = useToastStore();
  const opacity = new Animated.Value(0);

  useEffect(() => {
    if (!visible) return;

    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => hide());
    }, 2500);

    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.wrap, { opacity }]}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {kind === "badge" ? "🏆 " : ""}
          {message}
        </Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 24,
    zIndex: 999,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#111",
  },
  title: { color: "white", fontSize: 16, fontWeight: "700" },
  sub: { color: "#ddd", marginTop: 4 },
});
