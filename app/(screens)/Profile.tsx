/**
 * Écran Mon profil — édition du nom, genre, et changement de PIN.
 */

import { COLORS } from "@/components/ui/color";
import { getOne, runSql } from "@/src/db";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = {
  name: string;
  gender: string | null;
  pass: string;
  cloud_phone: string | null;
  cloud_email: string | null;
  plan: string;
};

type Section = "info" | "pin";

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<Section>("info");

  // Champs édition profil
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");

  // Changement PIN
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // ── Chargement ──────────────────────────────────────────────────────────────

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const row = await getOne<Profile>(
      `SELECT name, gender, pass, cloud_phone, cloud_email, plan
       FROM user_profile WHERE id = 1`
    );
    if (row) {
      setProfile(row);
      setName(row.name ?? "");
      setGender((row.gender as "male" | "female") ?? "male");
    }
  };

  // ── Sauvegarde infos ────────────────────────────────────────────────────────

  const handleSaveInfo = async () => {
    if (!name.trim()) {
      Alert.alert("Champ requis", "Le nom ne peut pas être vide.");
      return;
    }
    setSaving(true);
    await runSql(
      `UPDATE user_profile SET name = ?, gender = ? WHERE id = 1`,
      [name.trim(), gender]
    );
    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Profil mis à jour ✅", "", [{ text: "OK", onPress: () => router.back() }]);
  };

  // ── Changement PIN ──────────────────────────────────────────────────────────

  const handleChangePin = async () => {
    if (!profile) return;

    if (currentPin !== profile.pass) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("PIN incorrect", "Le PIN actuel ne correspond pas.");
      return;
    }
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      Alert.alert("PIN invalide", "Le nouveau PIN doit contenir 6 chiffres.");
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert("PIN différent", "Les deux nouveaux PIN ne correspondent pas.");
      return;
    }

    setSaving(true);
    await runSql(`UPDATE user_profile SET pass = ? WHERE id = 1`, [newPin]);
    setSaving(false);

    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setProfile((p) => (p ? { ...p, pass: newPin } : p));

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("PIN modifié ✅", "Ton nouveau PIN est actif.");
  };

  // ── UI ──────────────────────────────────────────────────────────────────────

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={COLORS.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mon profil</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?"}
              </Text>
            </View>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>
                {profile.plan === "pro" ? "⭐ Pro" : "Gratuit"}
              </Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, section === "info" && styles.tabActive]}
              onPress={() => setSection("info")}
            >
              <Text style={[styles.tabText, section === "info" && styles.tabTextActive]}>
                Informations
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, section === "pin" && styles.tabActive]}
              onPress={() => setSection("pin")}
            >
              <Text style={[styles.tabText, section === "pin" && styles.tabTextActive]}>
                Modifier le PIN
              </Text>
            </TouchableOpacity>
          </View>

          {/* ─── Section Infos ─────────────────────────────────────────────── */}
          {section === "info" && (
            <View style={styles.card}>
              {/* Nom */}
              <View style={styles.field}>
                <Text style={styles.label}>Nom complet</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ton nom"
                  placeholderTextColor="#aaa"
                  returnKeyType="done"
                />
              </View>

              {/* Genre */}
              <View style={styles.field}>
                <Text style={styles.label}>Genre</Text>
                <View style={styles.genderRow}>
                  <TouchableOpacity
                    style={[styles.genderBtn, gender === "male" && styles.genderBtnActive]}
                    onPress={() => setGender("male")}
                  >
                    <MaterialCommunityIcons
                      name="gender-male"
                      size={20}
                      color={gender === "male" ? "#fff" : COLORS.gray}
                    />
                    <Text style={[styles.genderText, gender === "male" && styles.genderTextActive]}>
                      Homme
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.genderBtn, gender === "female" && styles.genderBtnActive]}
                    onPress={() => setGender("female")}
                  >
                    <MaterialCommunityIcons
                      name="gender-female"
                      size={20}
                      color={gender === "female" ? "#fff" : COLORS.gray}
                    />
                    <Text style={[styles.genderText, gender === "female" && styles.genderTextActive]}>
                      Femme
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Compte cloud (readonly) */}
              {(profile.cloud_phone || profile.cloud_email) && (
                <View style={styles.field}>
                  <Text style={styles.label}>Compte cloud</Text>
                  <View style={styles.cloudInfo}>
                    <Feather name="cloud" size={16} color={COLORS.primary} />
                    <Text style={styles.cloudText}>
                      {profile.cloud_phone ?? profile.cloud_email}
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSaveInfo}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Enregistrer les modifications</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ─── Section PIN ───────────────────────────────────────────────── */}
          {section === "pin" && (
            <View style={styles.card}>
              <View style={styles.field}>
                <Text style={styles.label}>PIN actuel</Text>
                <TextInput
                  style={styles.input}
                  value={currentPin}
                  onChangeText={setCurrentPin}
                  placeholder="······"
                  placeholderTextColor="#aaa"
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Nouveau PIN (6 chiffres)</Text>
                <TextInput
                  style={styles.input}
                  value={newPin}
                  onChangeText={setNewPin}
                  placeholder="······"
                  placeholderTextColor="#aaa"
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Confirmer le nouveau PIN</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  placeholder="······"
                  placeholderTextColor="#aaa"
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleChangePin}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleChangePin}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Changer le PIN</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scroll: { padding: 20, paddingBottom: 60 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: { padding: 6 },
  headerTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 17,
    color: COLORS.dark,
  },

  // Avatar
  avatarWrap: { alignItems: "center", marginVertical: 24, gap: 8 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 32,
    color: "#fff",
  },
  planBadge: {
    backgroundColor: COLORS.gray + "20",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  planBadgeText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    color: COLORS.dark,
  },

  // Tabs
  tabs: {
    flexDirection: "row",
    backgroundColor: COLORS.gray + "15",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#fff" },
  tabText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    color: COLORS.gray,
  },
  tabTextActive: { color: COLORS.dark },

  // Card
  card: {
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  field: { gap: 6 },
  label: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    color: COLORS.dark,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 15,
    color: COLORS.dark,
    backgroundColor: "#fff",
  },

  // Genre
  genderRow: { flexDirection: "row", gap: 12 },
  genderBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#fff",
  },
  genderBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 14,
    color: COLORS.gray,
  },
  genderTextActive: { color: "#fff" },

  // Compte cloud
  cloudInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary + "10",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cloudText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 14,
    color: COLORS.primary,
  },

  // Bouton save
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 15,
    color: "#fff",
  },
});
