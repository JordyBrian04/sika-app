// src/components/ExpenseCalendar60Days.tsx
import { ThemedText } from "@/components/themed-text";
import { COLORS } from "@/components/ui/color";
import type { ExpenseDay } from "@/src/services/stats/expenseCalendar";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { FONT_FAMILY } from "../theme/fonts";

type Props = {
  data: ExpenseDay[]; // longueur 60
  title?: string;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function formatShortFR(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
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
  return `${d} ${months[m - 1]}`;
}

function intensityColor(level: 0 | 1 | 2 | 3 | 4, dark = true) {
  // Palette simple (dark-friendly)
  if (dark) {
    // fond sombre -> cases bleu/vert
    const colors = ["#1f2937", "#1e3a8a", "#1d4ed8", "#2563eb", "#38bdf8"];
    return colors[level];
  }
  // fond clair
  const colors = ["#e5e7eb", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6"];
  return colors[level];
}

function getLevel(amount: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (max <= 0 || amount <= 0) return 0;
  const r = amount / max; // 0..1
  if (r < 0.25) return 1;
  if (r < 0.5) return 2;
  if (r < 0.75) return 3;
  return 4;
}

export default function ExpenseCalendar60Days({
  data,
  title = "Calendrier dépenses (60 jours)",
}: Props) {
  const [selected, setSelected] = useState<ExpenseDay | null>(null);

  const max = useMemo(() => {
    return data.reduce((m, x) => Math.max(m, x.amount), 0);
  }, [data]);

  // Grille simple: 10 colonnes x 6 lignes = 60 cases
  const cols = 10;
  const rows = 6;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <ThemedText style={{ fontFamily: FONT_FAMILY.bold, fontSize: 14 }}>
          {title}
        </ThemedText>
        <ThemedText style={{ fontFamily: FONT_FAMILY.medium, fontSize: 12 }}>
          Max: {formatMoney(max)} FCFA
        </ThemedText>
      </View>

      <View style={styles.grid}>
        {Array.from({ length: rows }).map((_, r) => (
          <View key={r} style={styles.row}>
            {Array.from({ length: cols }).map((_, c) => {
              const idx = r * cols + c;
              const day = data[idx];
              if (!day)
                return (
                  <View
                    key={c}
                    style={[styles.cell, { backgroundColor: "transparent" }]}
                  />
                );

              const level = getLevel(day.amount, max);
              const isSelected = selected?.date === day.date;

              return (
                <Pressable
                  key={c}
                  onPress={() => setSelected(day)}
                  style={[
                    styles.cell,
                    { backgroundColor: intensityColor(level, true) },
                    isSelected && styles.selected,
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>

      {/* Footer info */}
      {selected ? (
        <View style={styles.infoRow}>
          <ThemedText style={{ fontFamily: FONT_FAMILY.medium, fontSize: 12 }}>
            {formatShortFR(selected.date)}
          </ThemedText>
          <ThemedText style={styles.infoAmount}>
            {formatMoney(selected.amount)} FCFA
          </ThemedText>
        </View>
      ) : (
        <ThemedText style={{ fontFamily: FONT_FAMILY.medium, fontSize: 12 }}>
          Appuie sur une case pour voir le détail.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.gray + "30",
    padding: 12,
    borderRadius: 16,
    gap: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  title: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "800",
  },
  subTitle: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
  },
  grid: {
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  cell: {
    width: 25,
    height: 25,
    borderRadius: 6,
  },
  selected: {
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  infoDate: {
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "700",
  },
  infoAmount: {
    color: "#38BDF8",
    fontSize: 12,
    fontFamily: FONT_FAMILY.semibold,
  },
  help: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
  },
});
