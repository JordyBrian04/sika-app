/**
 * Écran d'inscription / connexion cloud Sika.
 * - Inscription : téléphone (requis) + email (optionnel) + mot de passe
 * - Connexion  : téléphone + mot de passe
 * - Ignorable via le bouton "Plus tard"
 */

import { COLORS } from "@/components/ui/color";
import { getOne } from "@/src/db";
import {
  loginWithPhone,
  registerWithPhone,
} from "@/src/services/cloud/authService";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

type Mode = "register" | "login";

// ─── Composant ────────────────────────────────────────────────────────────────

export default function CloudSignup() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("register");

  // Détermine si on vient du flux "premier lancement" (pas d'historique nav)
  // Dans ce cas, "Plus tard" et "succès" doivent naviguer vers /(tabs),
  // pas router.back() qui renverrait sur l'écran PIN.
  const canGoBack = router.canGoBack();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Champs
  const [phone, setPhone] = useState("+225");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userName, setUserName] = useState("");

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Pré-remplir le nom depuis le profil local
  useEffect(() => {
    getOne<{ name: string }>(`SELECT name FROM user_profile WHERE id = 1`).then(
      (row) => {
        if (row?.name) setUserName(row.name);
      }
    );
  }, []);

  // ── Soumission ──────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedPhone || trimmedPhone === "+225") {
      Alert.alert("Champ requis", "Saisis ton numéro de téléphone.");
      return;
    }
    if (!/^\+\d{8,15}$/.test(trimmedPhone)) {
      Alert.alert("Format invalide", "Numéro au format +225XXXXXXXXXX");
      return;
    }
    if (trimmedPassword.length < 6) {
      Alert.alert("Mot de passe trop court", "Minimum 6 caractères.");
      return;
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert("Email invalide", "Vérifie l'adresse email.");
      return;
    }

    setLoading(true);

    const result =
      mode === "register"
        ? await registerWithPhone(
            trimmedPhone,
            trimmedPassword,
            userName,
            trimmedEmail || undefined
          )
        : await loginWithPhone(trimmedPhone, trimmedPassword);

    setLoading(false);

    if (!result.ok) {
      Alert.alert(
        mode === "register" ? "Inscription échouée" : "Connexion échouée",
        result.error
      );
      return;
    }

    // Toujours aller vers /(tabs) après succès — évite de revenir sur le PIN
    const goNext = () => router.replace("/(tabs)" as any);
    Alert.alert(
      mode === "register" ? "Compte créé 🎉" : "Connecté ✅",
      mode === "register"
        ? "Tes données seront synchronisées automatiquement."
        : "Tu es bien connecté à ton compte cloud.",
      [{ text: "Super !", onPress: goNext }]
    );
  };

  // ── UI ──────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Feather name="cloud" size={32} color={COLORS.white} />
            </View>
            <Text style={styles.title}>
              {mode === "register"
                ? "Sauvegarde tes données"
                : "Connecte-toi"}
            </Text>
            <Text style={styles.subtitle}>
              {mode === "register"
                ? "Crée un compte pour synchroniser tes finances entre tes appareils."
                : "Retrouve tes données sur n'importe quel appareil."}
            </Text>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            {/* Téléphone */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Numéro de téléphone *</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+225 07 XX XX XX XX"
                placeholderTextColor="#aaa"
                keyboardType="phone-pad"
                returnKeyType="next"
                onSubmitEditing={() =>
                  mode === "register"
                    ? emailRef.current?.focus()
                    : passwordRef.current?.focus()
                }
              />
            </View>

            {/* Email (inscription seulement) */}
            {mode === "register" && (
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>
                  Email{" "}
                  <Text style={styles.optional}>(optionnel)</Text>
                </Text>
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ton@email.com"
                  placeholderTextColor="#aaa"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
            )}

            {/* Mot de passe */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Mot de passe *</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 6 caractères"
                  placeholderTextColor="#aaa"
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>
              {mode === "register" && (
                <Text style={styles.hint}>
                  Retiens-le bien — il ne peut pas être récupéré par SMS pour l'instant.
                </Text>
              )}
            </View>

            {/* Bouton principal */}
            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.btnText}>
                  {mode === "register" ? "Créer mon compte" : "Se connecter"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Switcher mode */}
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => setMode((m) => (m === "register" ? "login" : "register"))}
            >
              <Text style={styles.switchText}>
                {mode === "register"
                  ? "J'ai déjà un compte → Se connecter"
                  : "Pas encore de compte → S'inscrire"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Skip — always replace to /(tabs) to avoid returning to PIN screen */}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => router.replace("/(tabs)" as any)}
          >
            <Text style={styles.skipText}>Plus tard</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scroll: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    alignItems: "center",
    marginBottom: 36,
    marginTop: 16,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 22,
    color: COLORS.dark,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  form: {
    gap: 4,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  label: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    color: COLORS.dark,
    marginBottom: 6,
  },
  optional: {
    fontFamily: FONT_FAMILY.regular,
    color: "#999",
    fontSize: 12,
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
    backgroundColor: "#FAFAFA",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eyeBtn: {
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
  },
  hint: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: "#999",
    marginTop: 6,
    lineHeight: 16,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 15,
    color: COLORS.white,
  },
  switchBtn: {
    alignItems: "center",
    paddingVertical: 14,
  },
  switchText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    color: COLORS.primary,
  },
  skipBtn: {
    alignItems: "center",
    marginTop: 24,
    paddingVertical: 10,
  },
  skipText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: "#aaa",
  },
});
