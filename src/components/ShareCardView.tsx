/**
 * ShareCardView — carte récapitulative mensuelle rendue en React Native Views.
 * Capturée en PNG via react-native-view-shot depuis stats.tsx.
 * Dimensions fixes 375×667 pour un rendu cohérent quelle que soit la taille d'écran.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { MonthlyData } from "@/src/services/reports/reportService";
import { formatWithCurrency } from "@/src/services/currency/currencyStore";

function monthName(m: number, y: number) {
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

function compact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "k";
  return String(Math.round(n));
}

type Props = { data: MonthlyData };

const ShareCardView = React.forwardRef<View, Props>(({ data }, ref) => {
  const savingRate =
    data.income > 0
      ? Math.round((Math.max(0, data.net) / data.income) * 100)
      : 0;
  const depenses = data.topCategories
    .filter((c) => c.type === "depense")
    .slice(0, 3);
  const maxDep = depenses.length > 0 ? Math.max(...depenses.map((d) => d.total)) : 1;

  return (
    <LinearGradient
      ref={ref as any}
      colors={["#0a0e1a", "#1a2235"]}
      style={styles.card}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Sika App</Text>
          <Text style={styles.monthLabel}>
            {monthName(data.month, data.year)}
          </Text>
        </View>
        <View style={styles.netBadge}>
          <Text style={styles.netText} numberOfLines={1}>
            {data.net >= 0 ? "+" : ""}
            {formatWithCurrency(data.net)}
          </Text>
        </View>
      </View>

      {/* ── Stats grid ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: "#4ade80" }]}>
            +{compact(data.income)}
          </Text>
          <Text style={styles.statLbl}>Revenus</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: "#f87171" }]}>
            -{compact(data.expense)}
          </Text>
          <Text style={styles.statLbl}>Dépenses</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: "#60a5fa" }]}>
            {savingRate}%
          </Text>
          <Text style={styles.statLbl}>Épargné</Text>
        </View>
      </View>

      {/* ── Top dépenses ── */}
      {depenses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TOP DÉPENSES</Text>
          {depenses.map((c, i) => {
            const barPct = Math.round((c.total / maxDep) * 100);
            return (
              <View key={i} style={{ marginBottom: 10 }}>
                <View style={styles.catRow}>
                  <Text style={styles.catName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.catAmt}>
                    {formatWithCurrency(c.total)}
                  </Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${barPct}%` as any }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Badges ── */}
      {data.badgesEarned.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BADGES CE MOIS</Text>
          <View style={styles.badgesRow}>
            {data.badgesEarned.slice(0, 3).map((b, i) => (
              <View key={i} style={styles.badgePill}>
                <Text style={styles.badgeText}>🏆 {b.title}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Footer ── */}
      <Text style={styles.footer}>
        Géré avec Sika App 📊 •{" "}
        {new Date().toLocaleDateString("fr-FR")}
      </Text>
    </LinearGradient>
  );
});

ShareCardView.displayName = "ShareCardView";
export default ShareCardView;

const styles = StyleSheet.create({
  card: {
    width: 375,
    height: 667,
    padding: 28,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  appName: { fontSize: 22, fontWeight: "800", color: "#265ed7" },
  monthLabel: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  netBadge: {
    backgroundColor: "#265ed7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: 160,
  },
  netText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  statVal: { fontSize: 14, fontWeight: "700" },
  statLbl: { fontSize: 10, color: "#94a3b8", marginTop: 2 },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 12,
    letterSpacing: 1,
  },
  catRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  catName: { fontSize: 12, color: "#cbd5e1", flex: 1, marginRight: 8 },
  catAmt: { fontSize: 12, color: "#f1f5f9", fontWeight: "600" },
  barBg: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    height: 5,
  },
  barFill: { backgroundColor: "#265ed7", height: 5, borderRadius: 3 },

  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  badgePill: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  badgeText: { fontSize: 11, color: "#f1f5f9" },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "#475569",
    fontSize: 11,
  },
});
