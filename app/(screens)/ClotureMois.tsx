import { ThemedText } from "@/components/themed-text";
import { COLORS } from "@/components/ui/color";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  cancelClosure,
  closureMonth,
  ClosureRow,
  getClosureForMonth,
  getTheoreticalBalance,
  isMonthClosed,
  listClosures,
} from "@/src/db/repositories/closureRepo";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { scheduleClosureReminder } from "@/src/notifications/closureReminder";
import { formatMoney } from "@/src/utils/format";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export default function ClotureMois() {
  const color = useThemeColor({ light: "#000000", dark: "#FFFFFF" }, "text");
  const bgCard = useThemeColor(
    { light: "#fff", dark: "#2a2a2a" },
    "background",
  );

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [theoreticalBalance, setTheoreticalBalance] = useState(0);
  const [physicalInput, setPhysicalInput] = useState("");
  const [note, setNote] = useState("");
  const [alreadyClosed, setAlreadyClosed] = useState(false);
  const [existingClosure, setExistingClosure] = useState<ClosureRow | null>(
    null,
  );
  const [closures, setClosures] = useState<ClosureRow[]>([]);
  const [loading, setLoading] = useState(false);

  // ─── Chargement des données ────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const theo = await getTheoreticalBalance(selectedMonth, selectedYear);
      setTheoreticalBalance(theo);

      const closed = await isMonthClosed(selectedMonth, selectedYear);
      setAlreadyClosed(closed);

      if (closed) {
        const c = await getClosureForMonth(selectedMonth, selectedYear);
        setExistingClosure(c);
      } else {
        setExistingClosure(null);
      }

      const hist = await listClosures(12);
      setClosures(hist);
    } catch (e) {
      console.warn("ClotureMois loadData error:", e);
    }
  }, [selectedMonth, selectedYear]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // ─── Mois clôturable ? ──────────────────────────────────────────
  const closureCheck = (() => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const selectedAbs = selectedYear * 12 + selectedMonth;
    const currentAbs = currentYear * 12 + currentMonth;

    // Mois futur → interdit
    if (selectedAbs > currentAbs) {
      return { allowed: false as const, reason: "future" as const };
    }

    // Mois en cours mais pas le dernier jour → pas encore
    if (selectedAbs === currentAbs) {
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
      if (today.getDate() < lastDayOfMonth) {
        return {
          allowed: false as const,
          reason: "not_last_day" as const,
          lastDay: lastDayOfMonth,
        };
      }
    }

    // Mois passé ou dernier jour du mois en cours → OK
    return { allowed: true as const, reason: null };
  })();

  const isFutureMonth = !closureCheck.allowed;

  // ─── Écart calculé ─────────────────────────────────────────────
  const physicalValue = Number(physicalInput) || 0;
  const difference = physicalValue - theoreticalBalance;

  // ─── Navigation mois ───────────────────────────────────────────
  const goToPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
    setPhysicalInput("");
    setNote("");
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
    setPhysicalInput("");
    setNote("");
  };

  // ─── Clôturer ──────────────────────────────────────────────────
  const handleClosure = async () => {
    if (!physicalInput.trim()) {
      Alert.alert("Attention", "Veuillez saisir votre solde physique.");
      return;
    }

    const diffLabel =
      difference > 0
        ? `+${formatMoney(String(difference))} FCFA (entrée)`
        : difference < 0
          ? `-${formatMoney(String(Math.abs(difference)))} FCFA (dépense)`
          : "Aucun écart";

    Alert.alert(
      "Confirmer la clôture",
      `Mois : ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}\n` +
        `Solde théorique : ${formatMoney(String(theoreticalBalance))} FCFA\n` +
        `Solde physique : ${formatMoney(physicalInput)} FCFA\n` +
        `Écart : ${diffLabel}\n\n` +
        `Cette action créera une transaction d'ajustement si l'écart est non nul.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Clôturer",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await closureMonth({
                month: selectedMonth,
                year: selectedYear,
                physicalBalance: physicalValue,
                note: note || undefined,
              });
              // Replanifier la notification pour le mois suivant
              await scheduleClosureReminder();
              Alert.alert("Succès", "Le mois a été clôturé avec succès.");
              setPhysicalInput("");
              setNote("");
              await loadData();
            } catch (e: any) {
              Alert.alert("Erreur", e?.message || "Erreur lors de la clôture.");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  // ─── Annuler une clôture ───────────────────────────────────────
  const handleCancelClosure = () => {
    if (!existingClosure) return;
    Alert.alert(
      "Annuler la clôture ?",
      "La transaction d'ajustement associée sera aussi supprimée. Cette action est irréversible.",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, annuler",
          style: "destructive",
          onPress: async () => {
            await cancelClosure(existingClosure.id);
            await loadData();
          },
        },
      ],
    );
  };

  // ─── Render ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={color} />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Clôture du mois</ThemedText>
            <View style={{ width: 24 }} />
          </View>

          {/* Sélecteur de mois */}
          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={goToPrevMonth} style={styles.arrowBtn}>
              <Feather name="chevron-left" size={24} color={color} />
            </TouchableOpacity>
            <ThemedText style={styles.monthLabel}>
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </ThemedText>
            <TouchableOpacity onPress={goToNextMonth} style={styles.arrowBtn}>
              <Feather name="chevron-right" size={24} color={color} />
            </TouchableOpacity>
          </View>

          {/* Solde théorique */}
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[styles.card, { backgroundColor: bgCard }]}
          >
            <View style={styles.cardRow}>
              <MaterialCommunityIcons
                name="calculator-variant"
                size={22}
                color={COLORS.primary}
              />
              <Text style={[styles.cardLabel, { color }]}>
                Solde théorique (app)
              </Text>
            </View>
            <Text
              style={[
                styles.cardAmount,
                { color: theoreticalBalance >= 0 ? "#34C759" : "#FF3B30" },
              ]}
            >
              {formatMoney(String(theoreticalBalance))} FCFA
            </Text>
            <Text style={[styles.cardHint, { color: COLORS.gray }]}>
              Calculé à partir de toutes vos transactions jusqu'à fin{" "}
              {MONTH_NAMES[selectedMonth - 1].toLowerCase()}
            </Text>
          </Animated.View>

          {/* Mois futur — non clôturable */}
          {isFutureMonth ? (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={[
                styles.card,
                {
                  backgroundColor: bgCard,
                  borderWidth: 1,
                  borderColor: "#FF9500" + "40",
                },
              ]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Feather name="alert-circle" size={20} color="#FF9500" />
                <Text
                  style={{
                    color: "#FF9500",
                    fontFamily: FONT_FAMILY.semibold,
                    fontSize: 14,
                  }}
                >
                  Mois non clôturable
                </Text>
              </View>
              <Text
                style={{
                  color: COLORS.gray,
                  fontFamily: FONT_FAMILY.regular,
                  fontSize: 13,
                  marginTop: 8,
                }}
              >
                {closureCheck.reason === "future"
                  ? `Vous ne pouvez clôturer que le mois en cours (le dernier jour) ou les mois précédents. ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} n'est pas encore commencé.`
                  : `La clôture n'est possible que le dernier jour du mois. Revenez le ${closureCheck.reason === "not_last_day" ? closureCheck.lastDay : ""} ${MONTH_NAMES[selectedMonth - 1].toLowerCase()} pour clôturer.`}
              </Text>
            </Animated.View>
          ) : /* Formulaire ou résultat existant */
          alreadyClosed && existingClosure ? (
            // ─── Mois déjà clôturé ───────────────────────────────
            <Animated.View
              entering={FadeIn.duration(300)}
              style={[styles.card, { backgroundColor: bgCard }]}
            >
              <View style={styles.closedBadge}>
                <Feather name="check-circle" size={18} color="#34C759" />
                <Text style={styles.closedBadgeText}>Mois clôturé</Text>
              </View>

              <View style={styles.closedRow}>
                <Text style={[styles.closedLabel, { color }]}>
                  Solde physique
                </Text>
                <Text style={[styles.closedValue, { color }]}>
                  {formatMoney(String(existingClosure.physical_balance))} FCFA
                </Text>
              </View>

              <View style={styles.closedRow}>
                <Text style={[styles.closedLabel, { color }]}>Écart</Text>
                <Text
                  style={[
                    styles.closedValue,
                    {
                      color:
                        existingClosure.difference > 0
                          ? "#34C759"
                          : existingClosure.difference < 0
                            ? "#FF3B30"
                            : COLORS.gray,
                    },
                  ]}
                >
                  {existingClosure.difference > 0 ? "+" : ""}
                  {formatMoney(String(existingClosure.difference))} FCFA
                </Text>
              </View>

              {existingClosure.note ? (
                <Text style={[styles.closedNote, { color: COLORS.gray }]}>
                  {existingClosure.note}
                </Text>
              ) : null}

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancelClosure}
              >
                <Feather name="x-circle" size={16} color="#FF3B30" />
                <Text style={styles.cancelBtnText}>Annuler cette clôture</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            // ─── Formulaire de saisie ─────────────────────────────
            <Animated.View
              entering={FadeIn.duration(300)}
              style={[styles.card, { backgroundColor: bgCard }]}
            >
              <Text style={[styles.inputLabel, { color }]}>
                Solde physique réel
              </Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, { color }]}
                  placeholder="Ex: 450000"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="numeric"
                  value={physicalInput}
                  onChangeText={setPhysicalInput}
                />
                <Text style={[styles.inputSuffix, { color: COLORS.gray }]}>
                  FCFA
                </Text>
              </View>

              {/* Écart dynamique */}
              {physicalInput.trim() !== "" && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(200)}
                  style={[
                    styles.diffBadge,
                    {
                      backgroundColor:
                        difference > 0
                          ? "#34C75920"
                          : difference < 0
                            ? "#FF3B3020"
                            : "#88888820",
                    },
                  ]}
                >
                  <Feather
                    name={
                      difference > 0
                        ? "trending-up"
                        : difference < 0
                          ? "trending-down"
                          : "minus"
                    }
                    size={18}
                    color={
                      difference > 0
                        ? "#34C759"
                        : difference < 0
                          ? "#FF3B30"
                          : COLORS.gray
                    }
                  />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text
                      style={[
                        styles.diffAmount,
                        {
                          color:
                            difference > 0
                              ? "#34C759"
                              : difference < 0
                                ? "#FF3B30"
                                : COLORS.gray,
                        },
                      ]}
                    >
                      {difference > 0 ? "+" : ""}
                      {formatMoney(String(difference))} FCFA
                    </Text>
                    <Text
                      style={{
                        color: COLORS.gray,
                        fontSize: 12,
                        fontFamily: FONT_FAMILY.regular,
                      }}
                    >
                      {difference > 0
                        ? "Entrée non enregistrée — sera ajoutée comme revenu"
                        : difference < 0
                          ? "Dépense non enregistrée — sera ajoutée comme dépense"
                          : "Parfait ! Aucun écart entre le théorique et le réel"}
                    </Text>
                  </View>
                </Animated.View>
              )}

              {/* Note optionnelle */}
              <Text style={[styles.inputLabel, { color, marginTop: 16 }]}>
                Note (optionnel)
              </Text>
              <TextInput
                style={[
                  styles.noteInput,
                  { color, borderColor: COLORS.gray + "40" },
                ]}
                placeholder="Ex: Oublié de noter un taxi..."
                placeholderTextColor={COLORS.gray}
                value={note}
                onChangeText={setNote}
                multiline
              />

              {/* Bouton clôturer */}
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  {
                    backgroundColor: COLORS.primary,
                    opacity: loading || !physicalInput.trim() ? 0.5 : 1,
                  },
                ]}
                onPress={handleClosure}
                disabled={loading || !physicalInput.trim()}
              >
                <Feather name="lock" size={18} color="#fff" />
                <Text style={styles.confirmBtnText}>Clôturer le mois</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Historique des clôtures */}
          {closures.length > 0 && (
            <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
              <ThemedText style={styles.historyTitle}>
                Historique des clôtures
              </ThemedText>
              {closures.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.historyItem, { backgroundColor: bgCard }]}
                  onPress={() => {
                    setSelectedMonth(c.month);
                    setSelectedYear(c.year);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyMonth, { color }]}>
                      {MONTH_NAMES[c.month - 1]} {c.year}
                    </Text>
                    <Text
                      style={{
                        color: COLORS.gray,
                        fontSize: 12,
                        fontFamily: FONT_FAMILY.regular,
                      }}
                    >
                      Physique : {formatMoney(String(c.physical_balance))} FCFA
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.historyDiff,
                      {
                        color:
                          c.difference > 0
                            ? "#34C759"
                            : c.difference < 0
                              ? "#FF3B30"
                              : COLORS.gray,
                      },
                    ]}
                  >
                    {c.difference > 0 ? "+" : ""}
                    {formatMoney(String(c.difference))}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.semibold,
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 20,
  },
  arrowBtn: {
    padding: 8,
  },
  monthLabel: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.semibold,
    minWidth: 160,
    textAlign: "center",
  },
  card: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.medium,
  },
  cardAmount: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.bold,
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.medium,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary + "40",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 8,
  },
  input: {
    flex: 1,
    fontSize: 22,
    fontFamily: FONT_FAMILY.semibold,
  },
  inputSuffix: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.medium,
    marginLeft: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    minHeight: 60,
    textAlignVertical: "top",
  },
  diffBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  diffAmount: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 20,
    gap: 8,
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: FONT_FAMILY.semibold,
  },
  closedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  closedBadgeText: {
    color: "#34C759",
    fontSize: 14,
    fontFamily: FONT_FAMILY.semibold,
  },
  closedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  closedLabel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
  },
  closedValue: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semibold,
  },
  closedNote: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 8,
    fontStyle: "italic",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: "#FF3B30",
    fontSize: 14,
    fontFamily: FONT_FAMILY.medium,
  },
  historyTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semibold,
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  historyMonth: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.medium,
  },
  historyDiff: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
  },
});
