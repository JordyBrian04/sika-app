import { ThemedText } from "@/components/themed-text";
import { COLORS } from "@/components/ui/color";
import { useThemeColor } from "@/hooks/use-theme-color";
import BottomSheet, { BottomSheetRefProps } from "@/src/components/BottomSheet";
import {
  addBudget,
  getCategoryMonthlyExpense,
} from "@/src/db/repositories/budgetRepo";
import { listeCategories } from "@/src/db/repositories/category";
import { FONT_FAMILY } from "@/src/theme/fonts";
import {
  AntDesign,
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SelectList } from "react-native-dropdown-select-list";

import { SafeAreaView } from "react-native-safe-area-context";
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function TabTwoScreen() {
  const color = useThemeColor({ light: "#000000", dark: "#FFFFFF" }, "text");
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [datas, setDatas] = useState<any[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [budgetDataset, setBudgetDataset] = useState<any>({
    mois: currentMonth,
    categorie: 0,
    annee: currentYear,
    montant: "0",
  });
  const ref = useRef<BottomSheetRefProps>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<
    { key: number; value: string }[]
  >([]);
  const MOIS = [
    { value: "Janvier", key: 1 },
    { value: "Février", key: 2 },
    { value: "Mars", key: 3 },
    { value: "Avril", key: 4 },
    { value: "Mai", key: 5 },
    { value: "Juin", key: 6 },
    { value: "Juillet", key: 7 },
    { value: "Août", key: 8 },
    { value: "Septembre", key: 9 },
    { value: "Octobre", key: 10 },
    { value: "Novembre", key: 11 },
    { value: "Décembre", key: 12 },
  ];

  const toggleSheet = useCallback(() => {
    const isActive = ref.current?.isActive?.();
    ref.current?.scrollTo(isActive ? SCREEN_HEIGHT : -500);
  }, []);

  const fetchCategories = async () => {
    // console.log(await listeCategories());
    const cats = await listeCategories();
    setCategories(
      cats
        .filter((c) => c.type === "depense")
        .map((c) => ({ key: c.id, value: c.name })),
    );
  };

  const fetchDatas = async () => {
    console.log(await getCategoryMonthlyExpense(currentMonth));
    setDatas(await getCategoryMonthlyExpense(currentMonth));
  };

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
      fetchDatas();
    }, [currentMonth]),
  );

  const resetDataset = () => {
    setBudgetDataset({
      mois: currentMonth,
      categorie: 0,
      annee: currentYear,
      montantLimite: "0",
    });
  };

  const handleSaveBudget = async () => {
    if (
      !budgetDataset.categorie ||
      Number(budgetDataset.montantLimite) <= 0 ||
      !budgetDataset.mois ||
      budgetDataset.annee === ""
    ) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      await addBudget(
        budgetDataset.mois,
        budgetDataset.annee,
        budgetDataset.categorie,
        budgetDataset.montantLimite,
      );
      resetDataset();
      toggleSheet();
      fetchDatas();
    } catch (e) {
      console.warn("Error saving budget:", e);
    } finally {
      setLoading(false);
    }
  };

  const renderBudgetItem = ({ item }: any) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={{
          padding: 15,
          backgroundColor: color === "#FFFFFF" ? COLORS.dark : COLORS.secondary,
          borderRadius: 8,
          gap: 15,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor:
                color === "#FFFFFF" ? COLORS.secondary : COLORS.dark,
              padding: 15,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 15,
              width: 60,
              justifyContent: "center",
              height: 60,
            }}
          >
            <MaterialIcons
              name="category"
              size={30}
              color={color === "#FFFFFF" ? COLORS.dark : COLORS.secondary}
            />
          </View>
          <View style={{ width: "68%", gap: 4 }}>
            <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
              {item.categoryName}
            </ThemedText>
            <Text style={{ fontFamily: FONT_FAMILY.regular, color: "#808080" }}>
              A ne pas dépasser
            </Text>
          </View>
          <AntDesign
            name="right"
            size={24}
            color={color === "#FFFFFF" ? COLORS.secondary : COLORS.secondary}
          />
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            justifyContent: "space-between",
          }}
        >
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <ThemedText
              style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 12 }}
            >
              Dépensé (CFA)
            </ThemedText>
            <Text
              style={{
                fontFamily: FONT_FAMILY.bold,
                color: color === "#FFFFFF" ? COLORS.secondary : COLORS.dark,
                fontSize: 16,
                textAlign: "center",
              }}
            >
              {item.totalSpent.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
            </Text>
          </View>
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <ThemedText
              style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 12 }}
            >
              Reste (CFA)
            </ThemedText>
            <Text
              style={{
                fontFamily: FONT_FAMILY.bold,
                color: item.remaining > 0 ? COLORS.green : COLORS.red,
                fontSize: 16,
                textAlign: "center",
              }}
            >
              {item.remaining.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
            </Text>
          </View>
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <ThemedText
              style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 12 }}
            >
              Limite (CFA)
            </ThemedText>
            <Text
              style={{
                fontFamily: FONT_FAMILY.bold,
                color: COLORS.red,
                fontSize: 16,
                textAlign: "center",
              }}
            >
              {item.monthlyLimit
                .toFixed(0)
                .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
            </Text>
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <View
            style={{
              backgroundColor: COLORS.secondary,
              height: 10,
              borderRadius: 5,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                backgroundColor:
                  item.monthlyLimit > 0
                    ? item.percentageUsed >= 70
                      ? COLORS.red
                      : item.percentageUsed >= 50
                        ? COLORS.orange
                        : COLORS.primary
                    : COLORS.primary,
                height: 10,
                width: item ? `${item.percentageUsed.toFixed(0)}%` : "0%",
              }}
            />
          </View>
          <ThemedText style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12 }}>
            {`${item.percentageUsed.toFixed(0)} %`} du budget déjà utilisé
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 10, gap: 20 }}
      >
        <ThemedText style={{ fontSize: 20, fontFamily: FONT_FAMILY.bold }}>
          💰 Mon budget mensuel
        </ThemedText>

        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginVertical: 10 }}
            contentContainerStyle={{ gap: 15, paddingHorizontal: 5 }}
          >
            {MOIS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor:
                    currentMonth === m.key ? "#007AFF" : "#E0E0E0",
                  alignItems: "center",
                  gap: 6,
                  flexDirection: "row",
                }}
                onPress={() => setCurrentMonth(m.key)}
              >
                <FontAwesome5
                  name="calendar-alt"
                  size={24}
                  color={currentMonth === m.key ? "#FFFFFF" : "#000000"}
                />
                <ThemedText
                  style={{
                    color: currentMonth === m.key ? "#FFFFFF" : "#000000",
                    fontFamily:
                      currentMonth === m.key
                        ? FONT_FAMILY.medium
                        : FONT_FAMILY.regular,
                  }}
                >
                  {m.value}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity
          style={{
            padding: 15,
            backgroundColor: "#007AFF",
            borderRadius: 8,
            alignItems: "center",
          }}
          onPress={toggleSheet}
        >
          <ThemedText
            style={{ color: "#FFFFFF", fontFamily: FONT_FAMILY.medium }}
          >
            Ajouter un budget pour ce mois
          </ThemedText>
        </TouchableOpacity>

        <FlatList
          data={datas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderBudgetItem}
          contentContainerStyle={{ gap: 15, paddingBottom: 100 }}
          ListEmptyComponent={() => (
            <ThemedText
              style={{
                textAlign: "center",
                marginTop: 50,
                color: "#808080",
                fontFamily: FONT_FAMILY.medium,
              }}
            >
              Aucun budget défini pour ce mois.
            </ThemedText>
          )}
          scrollEnabled={false}
        />
      </ScrollView>

      <BottomSheet ref={ref}>
        <ScrollView
          ref={scrollViewRef}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={true}
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 20,
            gap: 20,
            paddingBottom: 150,
            zIndex: 999,
            width: "100%",
          }}
        >
          <ThemedText style={{ fontSize: 18, fontFamily: FONT_FAMILY.bold }}>
            🎯 Créer un budget pour{" "}
            {MOIS.find((m) => m.key === currentMonth)?.value} {currentYear}
          </ThemedText>

          <View
            style={{
              zIndex: 10,
              flexDirection: "row",
              gap: 20,
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 18,
            }}
          >
            <View style={{ zIndex: 10, gap: 6, width: "45%" }}>
              <ThemedText
                style={{ fontSize: 16, fontFamily: FONT_FAMILY.medium }}
              >
                Mois
              </ThemedText>
              <SelectList
                setSelected={(val: any) =>
                  setBudgetDataset({ ...budgetDataset, mois: Number(val) })
                }
                data={MOIS}
                defaultOption={{
                  key: currentMonth,
                  value:
                    MOIS.find((cat) => cat.key === currentMonth)?.value ||
                    "Mois",
                }}
                save="key"
                placeholder="Sélectionnez un mois"
                boxStyles={{ borderRadius: 8, marginTop: 5 }}
                inputStyles={{ color: color }}
                dropdownTextStyles={{ color: color }}
                closeicon={<Ionicons name="close" size={18} color={color} />}
                searchicon={<Ionicons name="search" size={18} color={color} />}
                arrowicon={
                  <Feather name="chevron-down" size={24} color={color} />
                }
              />
            </View>
            <View style={{ zIndex: 10, gap: 6, width: "45%" }}>
              <ThemedText
                style={{ fontSize: 16, fontFamily: FONT_FAMILY.medium }}
              >
                Année
              </ThemedText>
              <TextInput
                value={budgetDataset.annee.toString()}
                onChangeText={(text) =>
                  setBudgetDataset({
                    ...budgetDataset,
                    annee: Number(text) || new Date().getFullYear(),
                  })
                }
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: "#E0E0E0",
                  borderRadius: 8,
                  padding: 10,
                  marginTop: 5,
                  color: color,
                  width: "100%",
                  height: 52,
                }}
              />
            </View>
          </View>
          <View style={{ zIndex: 10, gap: 6, width: "100%" }}>
            <ThemedText
              style={{ fontSize: 16, fontFamily: FONT_FAMILY.medium }}
            >
              Catégorie
            </ThemedText>
            <SelectList
              setSelected={(val: any) =>
                setBudgetDataset({ ...budgetDataset, categorie: Number(val) })
              }
              data={categories}
              save="key"
              placeholder="Sélectionnez une catégorie"
              boxStyles={{ borderRadius: 8, marginTop: 5 }}
              inputStyles={{ color: color }}
              dropdownTextStyles={{ color: color }}
              closeicon={<Ionicons name="close" size={18} color={color} />}
              searchicon={<Ionicons name="search" size={18} color={color} />}
              arrowicon={
                <Feather name="chevron-down" size={24} color={color} />
              }
            />
          </View>
          <View style={{ zIndex: 10, gap: 6, width: "100%" }}>
            <ThemedText
              style={{ fontSize: 16, fontFamily: FONT_FAMILY.medium }}
            >
              Montant limite
            </ThemedText>
            <TextInput
              placeholder="0"
              placeholderTextColor={color}
              value={budgetDataset.montantLimite}
              onChangeText={(text) =>
                setBudgetDataset({
                  ...budgetDataset,
                  montantLimite: Number(text) || 0,
                })
              }
              keyboardType="numeric"
              style={{
                borderWidth: 1,
                borderColor: "#E0E0E0",
                borderRadius: 8,
                padding: 10,
                marginTop: 5,
                color: color,
                width: "100%",
                height: 52,
              }}
            />
          </View>

          <TouchableOpacity
            style={{
              padding: 15,
              backgroundColor: COLORS.primary,
              borderRadius: 8,
              alignItems: "center",
              marginTop: 10,
              flexDirection: "row",
              justifyContent: "center",
              gap: 10,
              opacity: loading ? 0.7 : 1,
              alignContent: "center",
            }}
            onPress={handleSaveBudget}
            disabled={loading}
          >
            <Text
              style={{ color: "#FFFFFF", fontFamily: FONT_FAMILY.semibold }}
            >
              Enregistrer
              {loading && (
                <ActivityIndicator color="#FFFFFF" style={{ marginLeft: 10 }} />
              )}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
  },
});
