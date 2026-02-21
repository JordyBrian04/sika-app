import { computeBillingCycle } from "@/src/utils/billingCycle"; // adapte le chemin
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  nextDate: string; // "YYYY-MM-DD"
  frequency: "semaine" | "mensuel" | "annuel" | "personnalise";
  intervalCount: number; // ex 1
  customIntervalDays?: number;
};

export function BillingCycleCard({
  nextDate,
  frequency,
  intervalCount,
  customIntervalDays,
}: Props) {
  const cycle = useMemo(() => {
    return computeBillingCycle({
      nextDate,
      frequency,
      intervalCount,
      customIntervalDays,
    });
  }, [nextDate, frequency, intervalCount, customIntervalDays]);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.row}>
        <Text style={styles.title}>CYCLE DE FACTURATION</Text>
        <Text style={styles.rightText}>
          {cycle.daysRemaining} jours restants
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${cycle.progress * 100}%` }]}
        />
      </View>

      {/* Dates */}
      <View style={styles.row}>
        <Text style={styles.dateText}>{formatShortFR(cycle.start)}</Text>
        <Text style={styles.dateText}>{formatShortFR(cycle.end)}</Text>
      </View>
    </View>
  );
}

// Helpers locaux (ou importe ceux du util)
function formatShortFR(d: Date) {
  const months = [
    "Jan",
    "Fév",
    "Mar",
    "Avr",
    "Mai",
    "Juin",
    "Juil",
    "Aoû",
    "Sep",
    "Oct",
    "Nov",
    "Déc",
  ];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    gap: 10,
    // ombre légère
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: "#64748B",
  },
  rightText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16A34A",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#16A34A",
  },
  dateText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
});
