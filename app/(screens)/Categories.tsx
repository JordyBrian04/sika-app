import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import {
  CategoryInput,
  createCategory,
  deleteCategory,
  listeCategories,
  updateCategory,
} from "@/src/db/repositories/category";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { useModalQueue } from "@/src/ui/components/useModalQueue";
import { color } from "@/src/utils/colos";
import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SelectList } from "react-native-dropdown-select-list";
import { SafeAreaView } from "react-native-safe-area-context";

const TYPE_DATA = [
  { key: "depense", value: "Dépense" },
  { key: "entree", value: "Entrée" },
  { key: "event", value: "Charge ponctuelle" },
];

export default function Categories() {
  const [loading, setLoading] = React.useState(false);
  const [loading2, setLoading2] = React.useState(false);
  const [categories, setCategories] = React.useState<CategoryInput[]>([]);
  const [oldCategories, setOldCategories] = React.useState<CategoryInput[]>([]);
  const [categorieDatas, setCategorieDatas] = React.useState<CategoryInput>({
    id: 0,
    name: "",
    type: "depense",
  });
  const { openModal, closeModal, isVisible } = useModalQueue();

  const fetchCategories = async () => {
    setLoading(true);
    const cats = await listeCategories();
    setCategories(cats);
    setOldCategories(cats);
    setLoading(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchCategories();
    }, []),
  );

  const handleDelete = async (id: number): Promise<void> => {
    Alert.alert(
      "Supprimer",
      "Êtes-vous sûr de vouloir supprimer cette catégorie ?",
      [
        { text: "Annuler", onPress: () => {}, style: "cancel" },
        {
          text: "Supprimer",
          onPress: async () => {
            setLoading2(true);
            try {
              // TODO: Implement delete function in category repository
              await deleteCategory(id);
              await fetchCategories();
            } catch (error) {
              alert("Une erreur est survenue lors de la suppression.");
            } finally {
              setLoading2(false);
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  const renderCategoryItem = (category: CategoryInput) => {
    return (
      <View
        style={{
          padding: 12,
          backgroundColor: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
          borderRadius: 12,
          gap: 25,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              backgroundColor:
                color === "#FFFFFF" ? COLORS.secondary : COLORS.dark,
              padding: 15,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 15,
              width: 50,
              justifyContent: "center",
              height: 50,
            }}
          >
            <Image
              source={
                category.name?.toLowerCase().includes("alimentation")
                  ? require("../../assets/images/diet.png")
                  : category.name?.toLowerCase().includes("transport")
                    ? require("../../assets/images/transportation.png")
                    : category.name?.toLowerCase().includes("facture")
                      ? require("../../assets/images/bill.png")
                      : category.name?.toLowerCase().includes("abonnement")
                        ? require("../../assets/images/membership.png")
                        : category.name?.toLowerCase().includes("sante")
                          ? require("../../assets/images/pills.png")
                          : category.name?.toLowerCase().includes("loisirs")
                            ? require("../../assets/images/theater.png")
                            : category.name?.toLowerCase().includes("salaire")
                              ? require("../../assets/images/payroll.png")
                              : category.name?.toLowerCase().includes("depart")
                                ? require("../../assets/images/salary.png")
                                : category.name
                                      ?.toLowerCase()
                                      .includes("mission")
                                  ? require("../../assets/images/mission.png")
                                  : category.name
                                        ?.toLowerCase()
                                        .includes("famille")
                                    ? require("../../assets/images/big-family.png")
                                    : category.name
                                          ?.toLowerCase()
                                          .includes("education")
                                      ? require("../../assets/images/stack-of-books.png")
                                      : category.name
                                            ?.toLowerCase()
                                            .includes("shopping")
                                        ? require("../../assets/images/online-shopping.png")
                                        : category.name
                                              ?.toLowerCase()
                                              .includes("téléphone/internet")
                                          ? require("../../assets/images/iphone.png")
                                          : category.name
                                                ?.toLowerCase()
                                                .includes("soin")
                                            ? require("../../assets/images/lotions.png")
                                            : require("../../assets/images/shapes.png")
              }
              style={{ width: 30, height: 30 }}
            />
          </View>

          <View style={{ flex: 1 }}>
            <ThemedText style={{ fontSize: 16, fontFamily: FONT_FAMILY.bold }}>
              {category.name}
            </ThemedText>
            <ThemedText>
              {category.type === "depense"
                ? "Dépense"
                : category.type === "entree"
                  ? "Entrée"
                  : "Charge ponctuelle"}
            </ThemedText>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 10,
              backgroundColor: COLORS.primary,
              borderRadius: 8,
              justifyContent: "center",
              width: "45%",
            }}
            onPress={() => handleEdit(category)}
          >
            <AntDesign name="edit" size={20} color={COLORS.white} />
            <Text
              style={{ color: COLORS.white, fontFamily: FONT_FAMILY.medium }}
            >
              Modifier
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 10,
              backgroundColor: COLORS.red,
              borderRadius: 8,
              justifyContent: "center",
              width: "45%",
            }}
            onPress={() => handleDelete(category.id)}
          >
            <MaterialCommunityIcons
              name="delete"
              size={24}
              color={COLORS.white}
            />
            <Text
              style={{ color: COLORS.white, fontFamily: FONT_FAMILY.medium }}
            >
              Supprimer
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleEdit = (category: CategoryInput) => {
    setCategorieDatas(category);
    openModal("categorieModal");
  };

  const handleSave = async () => {
    if (!categorieDatas.name) {
      alert("Veuillez entrer un nom pour la catégorie.");
      return;
    }

    setLoading2(true);
    try {
      if (categorieDatas.id) {
        const updatedCategory = await updateCategory(categorieDatas);
        if (updatedCategory) {
          await fetchCategories();
          setCategorieDatas({ id: 0, name: "", type: "depense" });
          closeModal();
        } else {
          alert("Cette catégorie existe déjà.");
        }
        return;
      }

      const newCategory = await createCategory(categorieDatas);

      if (newCategory) {
        await fetchCategories();
        setCategorieDatas({ id: 0, name: "", type: "depense" });
        closeModal();
      } else {
        alert("Cette catégorie existe déjà.");
      }
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Une erreur est survenue lors de la création de la catégorie.");
    } finally {
      setLoading2(false);
    }
  };

  function categorieModal() {
    return (
      <Modal
        visible={isVisible("categorieModal")}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, justifyContent: "flex-end", width: "100%" }}
          >
            <View
              style={{
                width: "100%",
                backgroundColor: "#fff",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                position: "absolute",
                bottom: 0,
                paddingBottom: 70,
                gap: 20,
                // maxHeight: "90%",
                //   alignItems: "center",
              }}
            >
              <TouchableOpacity
                style={{
                  padding: 10,
                  backgroundColor: COLORS.secondary,
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  alignItems: "center",
                  justifyContent: "center",
                  alignSelf: "flex-end",
                }}
                onPress={closeModal}
              >
                <MaterialCommunityIcons
                  name="close-thick"
                  size={24}
                  color="black"
                />
              </TouchableOpacity>

              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: FONT_FAMILY.semibold }}>
                  Catégorie
                </Text>
                <SelectList
                  data={TYPE_DATA}
                  // key={keyReset}
                  setSelected={(val: any) =>
                    setCategorieDatas({
                      ...categorieDatas,
                      type: val,
                    })
                  }
                  placeholder="Choisir une catégorie"
                  inputStyles={{ color: COLORS.noir }}
                  searchPlaceholder="Entrez une catégorie"
                  dropdownTextStyles={{ color: COLORS.noir }}
                  closeicon={
                    <Ionicons name="close" size={18} color={COLORS.noir} />
                  }
                  searchicon={
                    <Ionicons name="search" size={18} color={COLORS.noir} />
                  }
                  arrowicon={
                    <Feather
                      name="chevron-down"
                      size={24}
                      color={COLORS.noir}
                    />
                  }
                  defaultOption={{
                    key: categorieDatas.type,
                    value:
                      TYPE_DATA.find((t) => t.key === categorieDatas.type)
                        ?.value || "",
                  }}
                  save="key"
                />
              </View>
              <View>
                <Text style={{ fontFamily: FONT_FAMILY.semibold }}>
                  Nom/description de la catégorie
                </Text>
                <TextInput
                  placeholder="Ex: Loyer, Famille..."
                  placeholderTextColor={COLORS.noir}
                  style={{
                    borderWidth: 1,
                    borderColor: "gray",
                    padding: 13,
                    borderRadius: 10,
                    color: COLORS.noir,
                    marginTop: 8,
                    textAlignVertical: "top",
                    fontFamily: FONT_FAMILY.regular,
                  }}
                  value={categorieDatas.name}
                  onChangeText={(e) =>
                    setCategorieDatas({ ...categorieDatas, name: e })
                  }
                />
              </View>

              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 12,
                  backgroundColor: COLORS.green,
                  borderRadius: 8,
                  justifyContent: "center",
                  opacity: loading2 ? 0.7 : 1,
                }}
                onPress={handleSave}
                disabled={loading2}
              >
                {/* <AntDesign name="plus" size={20} color={COLORS.white} /> */}
                {loading2 ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text
                    style={{
                      color: COLORS.white,
                      fontFamily: FONT_FAMILY.medium,
                    }}
                  >
                    Enregistrer
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={{ flex: 1 }} lightColor={COLORS.secondary}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            flexGrow: 1,
            padding: 16,
            gap: 16,
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl onRefresh={fetchCategories} refreshing={loading} />
          }
        >
          <TouchableOpacity
            style={{
              backgroundColor: color === "#FFFFFF" ? COLORS.white : COLORS.dark,
              padding: 10,
              alignItems: "center",
              justifyContent: "center",
              width: 50,
              height: 50,
              borderRadius: 100,
            }}
            onPress={() => router.back()}
          >
            <AntDesign
              name="left"
              size={24}
              color={color === "#FFFFFF" ? COLORS.dark : COLORS.white}
            />
          </TouchableOpacity>

          <View>
            <ThemedText style={{ fontSize: 24, fontFamily: FONT_FAMILY.bold }}>
              Catégories
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 14,
                color: COLORS.gray,
                marginTop: 4,
                fontFamily: FONT_FAMILY.medium,
              }}
            >
              Gérer vos catégories de dépenses et d'entrées.
            </ThemedText>
          </View>

          <View
            style={{
              borderWidth: 1,
              borderColor: color,
              borderRadius: 12,
              padding: 5,
              marginTop: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Ionicons name="search-outline" size={24} color={color} />
            <TextInput
              style={{
                color: color,
                width: "100%",
                fontFamily: FONT_FAMILY.regular,
              }}
              placeholder="Rechercher..."
              placeholderTextColor={color}
              // onChangeText={handleSearch}
              returnKeyType="search"
            />
          </View>

          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 10,
              backgroundColor: COLORS.green,
              borderRadius: 8,
              justifyContent: "center",
            }}
            onPress={() => openModal("categorieModal")}
          >
            <AntDesign name="plus" size={20} color={COLORS.white} />
            <Text
              style={{ color: COLORS.white, fontFamily: FONT_FAMILY.medium }}
            >
              Ajouter une catégorie
            </Text>
          </TouchableOpacity>

          <View>
            <FlatList
              data={categories}
              renderItem={({ item }) => renderCategoryItem(item)}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              contentContainerStyle={{ gap: 12 }}
              ListEmptyComponent={() => (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ThemedText
                    style={{ fontFamily: FONT_FAMILY.medium, fontSize: 16 }}
                  >
                    Aucune catégorie trouvée
                  </ThemedText>
                </View>
              )}
            />
          </View>
        </ScrollView>
      </ThemedView>
      {categorieModal()}
    </SafeAreaView>
  );
}
