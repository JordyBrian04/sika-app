import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import { useThemeColor } from "@/hooks/use-theme-color";
import { listeCategories } from "@/src/db/repositories/category";
import {
  deleteRecurringPayment,
  listAllUpcomingRecurring,
  listPendingRecurringOccurrences,
  updateRecurringPayment,
} from "@/src/db/repositories/recurringRepo";
import {
  markRecurringOccurrencePaid,
  markRecurringOccurrenceSkipped,
} from "@/src/services/recurring/validation";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { useModalQueue } from "@/src/ui/components/useModalQueue";
import { formatMoney } from "@/src/utils/format";
import {
  AntDesign,
  Feather,
  Foundation,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SelectList } from "react-native-dropdown-select-list";
import { SafeAreaView } from "react-native-safe-area-context";

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

type Frequency = "semaine" | "mensuel" | "annuel" | "jour";
const REMIND_PRESETS = [0, 1, 2, 3, 7];

const IncomingEvent = () => {
  const color = useThemeColor({ light: "#000000", dark: "#FFFFFF" }, "text");
  const [keyReset, setKeyReset] = useState(0);
  const [paiementsEnRetard, setPaiementsEnRetard] = React.useState<any[]>([]);
  const [paiementsAvenir, setPaiementsAvenir] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loading2, setLoading2] = React.useState(false);
  const { openModal, closeModal, isVisible } = useModalQueue();
  const [transactionData, setTransactionData] = useState({
    amount: "0",
    category_id: 0,
    recurring_id: null,
    id: 0,
    name: "",
    frequency: "semaine" as Frequency,
    interval_count: "1",
    next_date: new Date().toISOString().substring(0, 10),
    remind_days_before: 2,
    active: 1,
  });
  const [categories, setCategories] = useState<
    { key: number; value: string }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date());
  const toggleDatePicker = () => {
    setOpen(!open);
  };

  const onChange = ({ type }: any, selectedDate: any) => {
    if (type === "set") {
      const currentDate = selectedDate;
      setDate(currentDate);

      if (Platform.OS === "android") {
        toggleDatePicker();

        //On attribu la date à la valeur date (currentDate.toLocaleDateString('fr-FR'))
        setTransactionData({
          ...transactionData,
          next_date: currentDate.toISOString().substring(0, 10),
        });
        // setTache({
        //   ...tache,
        //   date: currentDate.toLocaleDateString('fr-FR', options)
        // })
      }
    } else {
      toggleDatePicker();
    }
  };

  const confirmIOSDate = () => {
    // console.log(date.toISOString().substring(0, 10));
    setTransactionData({
      ...transactionData,
      next_date: date.toISOString().substring(0, 10),
    });
    toggleDatePicker();
  };

  const getConstant = async () => {
    const cats = await listeCategories();
    setCategories(
      cats
        .filter((c) => c.type === "event")
        .map((c) => ({ key: c.id, value: c.name })),
    );
  };

  const groupTransactionsByStatut = (transactions: any[]) => {
    const groups = transactions.reduce((acc, transaction) => {
      const statut = transaction.active;
      // console.log("Transaction:", transaction, "Statut:", statut);
      if (!acc[statut]) {
        acc[statut] = [];
      }
      acc[statut].push(transaction);
      return acc;
    }, {});

    // On transforme l'objet en tableau pour le rendu
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((statut) => ({
        statut,
        data: groups[statut],
      }));
  };

  const fetchPaiements = async () => {
    setLoading(true);
    const allDuePaiements = await listPendingRecurringOccurrences(100);
    setPaiementsEnRetard(allDuePaiements);
    console.log("All due paiements:", allDuePaiements);

    const allPaiements = await listAllUpcomingRecurring(100);
    setPaiementsAvenir(groupTransactionsByStatut(allPaiements));
    console.log("All upcoming paiements:", allPaiements);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      getConstant();
      fetchPaiements();
    }, []),
  );

  const toggleSwitch = () =>
    setTransactionData({
      ...transactionData,
      active: transactionData.active === 1 ? 0 : 1,
    });

  const renderDuePaiementItem = (item: any) => (
    <ThemedView
      style={{
        padding: 12,
        borderRadius: 8,
        backgroundColor: color === "#FFFFFF" ? COLORS.dark : COLORS.secondary,
        gap: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Image
          source={
            item.name.toLowerCase().includes("netflix")
              ? require("../../assets/images/netflix.png")
              : item.name.toLowerCase().includes("loyer")
                ? require("../../assets/images/3d-house.png")
                : item.name.toLowerCase().includes("amazon")
                  ? require("../../assets/images/amazon.png")
                  : item.name.toLowerCase().includes("facture")
                    ? require("../../assets/images/bill.png")
                    : item.name.toLowerCase().includes("canca")
                      ? require("../../assets/images/canva.jpg")
                      : item.name.toLowerCase().includes("chatgpt")
                        ? require("../../assets/images/chatgpt.png")
                        : item.name.toLowerCase().includes("facebook")
                          ? require("../../assets/images/facebook.png")
                          : item.name.toLowerCase().includes("gemini")
                            ? require("../../assets/images/gemini.jpg")
                            : item.name.toLowerCase().includes("spotify")
                              ? require("../../assets/images/spotify.png")
                              : item.name.toLowerCase().includes("instagram")
                                ? require("../../assets/images/instagram.png")
                                : item.name.toLowerCase().includes("prime")
                                  ? require("../../assets/images/prime.png")
                                  : item.name.toLowerCase().includes("tiktok")
                                    ? require("../../assets/images/tiktok.png")
                                    : item.name.toLowerCase().includes("upwork")
                                      ? require("../../assets/images/upwork.png")
                                      : item.name
                                            .toLowerCase()
                                            .includes("youtube")
                                        ? require("../../assets/images/youtube.png")
                                        : require("../../assets/images/schedule.png")
          }
          style={{
            width: 50,
            height: 50,
            borderRadius: 16,
            resizeMode: "cover",
          }}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
            {item.name}
          </ThemedText>
          <Text
            style={{
              fontFamily: FONT_FAMILY.medium,
              color: item.daysLate <= 7 ? COLORS.orange : COLORS.red,
              fontSize: 12,
            }}
          >
            En retard depuis {item.daysLate} jours
          </Text>
        </View>

        <ThemedText style={{ fontFamily: FONT_FAMILY.bold }}>
          {formatMoney(item.amount)} CFA
        </ThemedText>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor:
              color === "#FFFFFF" ? COLORS.secondary : COLORS.dark,
            padding: 12,
            borderRadius: 15,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={async () => [
            await markRecurringOccurrencePaid(item.id),
            fetchPaiements(),
          ]}
        >
          <Text
            style={{
              fontFamily: FONT_FAMILY.bold,
              color: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
              fontSize: 13,
            }}
          >
            Payer maintenant
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: COLORS.red + "30",
            padding: 12,
            borderRadius: 15,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={async () => {
            await markRecurringOccurrenceSkipped(item.id);
            fetchPaiements();
          }}
        >
          <Text
            style={{
              fontFamily: FONT_FAMILY.bold,
              color: COLORS.red,
              fontSize: 13,
            }}
          >
            Ignorer le paiement
          </Text>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );

  const renderIncomingPaiementItem = (item: any) => (
    <View>
      <Text
        style={{
          fontFamily: FONT_FAMILY.medium,
          fontSize: 16,
          marginBottom: 10,
          color: "#888",
        }}
      >
        {item.statut === "1" ? "Actif" : "Inactif"}
      </Text>

      {item.data.map((trans: any) => (
        <TouchableOpacity
          key={trans.id}
          onLongPress={() => {
            setTransactionData({
              ...transactionData,
              id: trans.id,
              name: trans.name,
              amount: trans.amount.toString(),
              category_id: trans.category_id,
              frequency: trans.frequency,
              interval_count: trans.interval_count.toString(),
              next_date: trans.next_date,
              remind_days_before: trans.remind_days_before,
              active: trans.active,
            });
            openModal("incomingPaiementModal");
          }}
          onPress={() =>
            router.push({
              pathname: "/(screens)/DetailEvent",
              params: {
                id: trans.id,
                name: trans.name,
                amount: trans.amount.toString(),
                category_id: trans.category_id,
                category_name:
                  categories.find((c) => c.key === trans.category_id)?.value ||
                  "Aucune",
                frequency: trans.frequency,
                interval_count: trans.interval_count.toString(),
                next_date: trans.next_date,
                remind_days_before: trans.remind_days_before,
                active: trans.active,
                daysLate: trans.daysLate,
              },
            })
          }
          style={{
            padding: 12,
            borderRadius: 12,
            backgroundColor:
              color === "#FFFFFF" ? COLORS.dark : COLORS.secondary,
            gap: 12,
            marginBottom: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Image
              source={
                trans.name.toLowerCase().includes("netflix")
                  ? require("../../assets/images/netflix.png")
                  : trans.name.toLowerCase().includes("loyer")
                    ? require("../../assets/images/3d-house.png")
                    : trans.name.toLowerCase().includes("amazon")
                      ? require("../../assets/images/amazon.png")
                      : trans.name.toLowerCase().includes("facture")
                        ? require("../../assets/images/bill.png")
                        : trans.name.toLowerCase().includes("canca")
                          ? require("../../assets/images/canva.jpg")
                          : trans.name.toLowerCase().includes("chatgpt")
                            ? require("../../assets/images/chatgpt.png")
                            : trans.name.toLowerCase().includes("facebook")
                              ? require("../../assets/images/facebook.png")
                              : trans.name.toLowerCase().includes("gemini")
                                ? require("../../assets/images/gemini.jpg")
                                : trans.name.toLowerCase().includes("spotify")
                                  ? require("../../assets/images/spotify.png")
                                  : trans.name
                                        .toLowerCase()
                                        .includes("instagram")
                                    ? require("../../assets/images/instagram.png")
                                    : trans.name.toLowerCase().includes("prime")
                                      ? require("../../assets/images/prime.png")
                                      : trans.name
                                            .toLowerCase()
                                            .includes("tiktok")
                                        ? require("../../assets/images/tiktok.png")
                                        : trans.name
                                              .toLowerCase()
                                              .includes("upwork")
                                          ? require("../../assets/images/upwork.png")
                                          : trans.name
                                                .toLowerCase()
                                                .includes("youtube")
                                            ? require("../../assets/images/youtube.png")
                                            : require("../../assets/images/schedule.png")
              }
              style={{
                width: 50,
                height: 50,
                borderRadius: 16,
                resizeMode: "cover",
              }}
            />
            <View style={{ flex: 1, marginLeft: 10, gap: 5 }}>
              <ThemedText
                style={{ fontFamily: FONT_FAMILY.semibold }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {trans.name}
              </ThemedText>
              <Text
                style={{
                  fontFamily: FONT_FAMILY.medium,
                  color: COLORS.gray,
                  fontSize: 12,
                }}
              >
                {formatDate(trans.next_date)}
              </Text>
            </View>

            <View style={{ gap: 5 }}>
              <ThemedText style={{ fontFamily: FONT_FAMILY.bold }}>
                {formatMoney(trans.amount)} CFA
              </ThemedText>
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.green,
                  textAlign: "right",
                  fontFamily: FONT_FAMILY.regular,
                  backgroundColor: COLORS.green + "20",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 12,
                }}
              >
                {trans.frequency === "semaine"
                  ? "Chaque semaine"
                  : trans.frequency === "mensuel"
                    ? "Chaque mois"
                    : trans.frequency === "annuel"
                      ? "Chaque année"
                      : `Tous les ${trans.interval_count} jours`}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
      {/* */}
    </View>
  );

  const handleSave = async () => {
    if (
      !transactionData.name ||
      !transactionData.frequency ||
      transactionData.amount === "0" ||
      transactionData.category_id === 0 ||
      transactionData.next_date === new Date().toISOString().substring(0, 10)
    ) {
      alert(
        "Veuillez remplir tous les champs obligatoires pour les charges mensuelles.",
      );
      return;
    }

    setLoading2(true);
    try {
      await updateRecurringPayment(transactionData.id, {
        name: transactionData.name,
        amount: parseInt(transactionData.amount),
        frequency: transactionData.frequency,
        category_id: transactionData.category_id,
        next_date: transactionData.next_date,
        interval_count: parseInt(transactionData.interval_count),
        remind_days_before: transactionData.remind_days_before,
        active: transactionData.active,
      });

      alert("Charge mensuelle mise à jour avec succès !");
      fetchPaiements();
      closeModal();
    } catch (error) {
      alert(
        "Une erreur est survenue lors de la mise à jour de la charge mensuelle.",
      );
    } finally {
      setLoading2(false);
    }
  };

  const handleDelete = async () => {
    setLoading2(true);
    try {
      await deleteRecurringPayment(transactionData.id);
      alert("Charge mensuelle supprimée avec succès !");
      fetchPaiements();
      closeModal();
    } catch (error) {
      alert(
        "Une erreur est survenue lors de la suppression de la charge mensuelle.",
      );
    } finally {
      setLoading2(false);
    }
  };

  function incomingPaiementModal() {
    return (
      <Modal
        transparent={true}
        visible={isVisible("incomingPaiementModal")}
        animationType="slide"
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
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
                maxHeight: "90%",
                //   alignItems: "center",
              }}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 20 }}
                // style={{ maxHeight: "70%" }}
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

                <View
                  style={{
                    gap: 8,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontFamily: FONT_FAMILY.regular }}>
                    Montant (CFA)
                  </Text>
                  <TextInput
                    placeholder="0"
                    keyboardType="numeric"
                    style={{
                      fontFamily: FONT_FAMILY.bold,
                      fontSize: 24,
                      width: "100%",
                      // color: color,
                      textAlign: "center",
                    }}
                    placeholderTextColor={color}
                    onChangeText={(e) =>
                      setTransactionData({
                        ...transactionData,
                        amount: e,
                      })
                    }
                    value={transactionData.amount}
                  />
                </View>
                <View>
                  <Text style={{ fontFamily: FONT_FAMILY.semibold }}>
                    Nom ou description de la charge
                  </Text>
                  <TextInput
                    placeholder="Ex: Loyer, électricité..."
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
                    value={transactionData.name}
                    onChangeText={(e) =>
                      setTransactionData({ ...transactionData, name: e })
                    }
                  />
                </View>
                <View style={{ gap: 8 }}>
                  <Text style={{ fontFamily: FONT_FAMILY.semibold }}>
                    Catégorie
                  </Text>
                  <SelectList
                    data={categories}
                    key={keyReset}
                    setSelected={(val: string) =>
                      setTransactionData({
                        ...transactionData,
                        category_id: parseInt(val),
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
                      key: transactionData.category_id,
                      value: categories.find(
                        (c) => c.key === transactionData.category_id,
                      )?.value,
                    }}
                    save="key"
                  />
                </View>
                <View style={{ gap: 8 }}>
                  <Text style={{ fontFamily: FONT_FAMILY.semibold }}>
                    Date de paiement
                  </Text>
                  <View
                    style={{
                      // flexDirection: "row",
                      // alignItems: "center",
                      width: "100%",
                      gap: 8,
                      // justifyContent: "space-between",
                    }}
                  >
                    {open && (
                      <DateTimePicker
                        mode="date"
                        display="spinner"
                        value={date}
                        onChange={onChange}
                        style={{
                          height: 120,
                          marginTop: 20,
                          width: "100%",
                        }}
                        textColor="#000"
                      />
                    )}

                    {open && Platform.OS === "ios" && (
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-around",
                          marginBottom: 20,
                        }}
                      >
                        <TouchableOpacity
                          style={{
                            padding: 10,
                            backgroundColor: "gray",
                            borderRadius: 10,
                          }}
                          onPress={toggleDatePicker}
                        >
                          <Text style={{ color: "black", fontWeight: "bold" }}>
                            Annuler
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{
                            padding: 10,
                            backgroundColor: "gray",
                            borderRadius: 10,
                          }}
                          onPress={confirmIOSDate}
                        >
                          <Text style={{ color: "black", fontWeight: "bold" }}>
                            Valider
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {!open && (
                      <TouchableOpacity onPress={toggleDatePicker}>
                        <TextInput
                          placeholder="Date debut"
                          placeholderTextColor="#000"
                          style={{
                            borderWidth: 1,
                            borderColor: "gray",
                            padding: 10,
                            borderRadius: 10,
                            color: COLORS.noir,
                            fontFamily: FONT_FAMILY.regular,
                            height: 52,
                            width: "100%",
                          }}
                          editable={false}
                          value={transactionData.next_date}
                          onChangeText={(e: any) =>
                            setTransactionData({
                              ...transactionData,
                              next_date: e,
                            })
                          }
                          onPressIn={toggleDatePicker}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={{ gap: 8 }}>
                  <Text style={{ fontFamily: FONT_FAMILY.semibold }}>
                    Rappel
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 12 }}
                  >
                    {REMIND_PRESETS.map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        style={{
                          padding: 10,
                          backgroundColor:
                            transactionData.remind_days_before === preset
                              ? COLORS.primary
                              : COLORS.secondary,
                          borderRadius: 10,
                        }}
                        onPress={() =>
                          setTransactionData({
                            ...transactionData,
                            remind_days_before: preset,
                          })
                        }
                      >
                        <Text
                          style={{
                            color:
                              transactionData.remind_days_before === preset
                                ? COLORS.white
                                : COLORS.noir,
                            fontFamily: FONT_FAMILY.regular,
                          }}
                        >
                          {preset === 0 ? "Jour J" : `J-${preset}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View
                  style={{
                    gap: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ fontFamily: FONT_FAMILY.semibold }}>
                    Actif
                  </Text>
                  <Switch
                    trackColor={{ false: COLORS.gray, true: COLORS.gray }}
                    thumbColor={
                      transactionData.active ? COLORS.green : COLORS.secondary
                    }
                    style={{ transform: [{ scaleX: 1 }, { scaleY: 1 }] }}
                    onValueChange={toggleSwitch}
                    value={transactionData.active === 1}
                  />
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
                      padding: 15,
                      backgroundColor: COLORS.red,
                      borderRadius: 10,
                      alignItems: "center",
                      width: "45%",
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 14,
                      opacity: loading2 ? 0.7 : 1,
                    }}
                    disabled={loading2}
                    onPress={() => {
                      if (!loading2 && transactionData.id) {
                        Alert.alert(
                          "Confirmer la suppression",
                          "Êtes-vous sûr de vouloir supprimer cette charge mensuelle ?",
                          [
                            {
                              text: "Annuler",
                              style: "cancel",
                            },
                            {
                              text: "Supprimer",
                              style: "destructive",
                              onPress: handleDelete,
                            },
                          ],
                        );
                      }
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.white,
                        fontFamily: FONT_FAMILY.bold,
                      }}
                    >
                      Supprimer
                      {loading2 && <ActivityIndicator color={COLORS.white} />}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSave}
                    style={{
                      padding: 15,
                      backgroundColor: COLORS.primary,
                      borderRadius: 10,
                      alignItems: "center",
                      width: "45%",
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 14,
                      opacity: loading2 ? 0.7 : 1,
                    }}
                    disabled={loading2}
                  >
                    <Text
                      style={{
                        color: COLORS.white,
                        fontFamily: FONT_FAMILY.bold,
                      }}
                    >
                      Modifier
                      {loading2 && <ActivityIndicator color={COLORS.white} />}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 22, paddingBottom: 100, padding: 16 }}
          refreshControl={
            <RefreshControl onRefresh={fetchPaiements} refreshing={loading} />
          }
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 20,
            }}
          >
            <TouchableOpacity onPress={() => router.back()}>
              <AntDesign name="left" size={24} color={color} />
            </TouchableOpacity>
            <ThemedText
              style={{
                fontSize: 20,
                textAlign: "center",
                fontFamily: FONT_FAMILY.bold,
              }}
            >
              Liste des paiements à venir
            </ThemedText>
          </View>

          {/* Paiements en retard */}
          <View style={{ marginTop: 22, gap: 22 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Foundation name="alert" size={24} color={COLORS.orange} />
              <ThemedText
                style={{ fontFamily: FONT_FAMILY.bold, fontSize: 22 }}
              >
                Paiements en retard
              </ThemedText>
            </View>

            <View>
              <FlatList
                data={paiementsEnRetard}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => renderDuePaiementItem(item)}
                scrollEnabled={false}
                contentContainerStyle={{ gap: 12 }}
                ListEmptyComponent={() => (
                  <View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      flex: 1,
                      gap: 12,
                    }}
                  >
                    <ThemedText
                      style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 17 }}
                    >
                      Aucun paiement en retard
                    </ThemedText>
                  </View>
                )}
              />
            </View>
          </View>

          {/* Paiements à venir */}
          <View style={{ marginTop: 22, gap: 22 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              {/* <Foundation name="alert" size={24} color={COLORS.orange} /> */}
              <ThemedText
                style={{ fontFamily: FONT_FAMILY.bold, fontSize: 22 }}
              >
                Paiements à venir
              </ThemedText>
            </View>

            <View>
              <FlatList
                data={paiementsAvenir}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => renderIncomingPaiementItem(item)}
                scrollEnabled={false}
                contentContainerStyle={{ gap: 12 }}
                ListEmptyComponent={() => (
                  <View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      flex: 1,
                      gap: 12,
                    }}
                  >
                    <ThemedText
                      style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 17 }}
                    >
                      Aucun paiement à venir
                    </ThemedText>
                  </View>
                )}
              />
            </View>
          </View>
        </ScrollView>
      </ThemedView>
      {incomingPaiementModal()}
    </SafeAreaView>
  );
};

export default IncomingEvent;
