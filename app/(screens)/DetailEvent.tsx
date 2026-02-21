import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import { BillingCycleCard } from "@/src/components/BillingCycleCard";
import { listeCategories } from "@/src/db/repositories/category";
import {
    deleteRecurringPayment,
    updateRecurringPayment,
} from "@/src/db/repositories/recurringRepo";
import { listTransactions } from "@/src/db/repositories/transactions";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { useModalQueue } from "@/src/ui/components/useModalQueue";
import { color } from "@/src/utils/colos";
import { formatMoney } from "@/src/utils/format";
import {
    AntDesign,
    Feather,
    Ionicons,
    MaterialCommunityIcons,
    MaterialIcons,
} from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SelectList } from "react-native-dropdown-select-list";
import { SafeAreaView } from "react-native-safe-area-context";

const REMIND_PRESETS = [0, 1, 2, 3, 7];

const DetailEvent = () => {
  const {
    name,
    amount,
    next_date,
    frequency,
    daysLate,
    category_name,
    interval_count,
    id,
    category_id,
    remind_days_before,
    active,
  }: any = useLocalSearchParams();

  //   console.log(remind_days_before, active, category_name);

  const [loading, setLoading] = React.useState(false);
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [transactionData, setTransactionData] = useState({
    amount: amount,
    category_id: category_id,
    recurring_id: null,
    id: id,
    name: name,
    frequency: frequency,
    interval_count: interval_count,
    next_date: next_date,
    remind_days_before: remind_days_before,
    active: active,
  });
  const [categories, setCategories] = useState<
    { key: number; value: string }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date());
  const [keyReset, setKeyReset] = useState(0);
  const { openModal, closeModal, isVisible } = useModalQueue();
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

  const toggleSwitch = () =>
    setTransactionData({
      ...transactionData,
      active: transactionData.active === 1 ? 0 : 1,
    });

    
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

    setLoading(true);
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
      closeModal();
      router.back();
    } catch (error) {
      alert(
        "Une erreur est survenue lors de la mise à jour de la charge mensuelle.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    const allTransactions = await listTransactions(200).then((res) =>
      res.filter((t) => t.recurring_id === Number(id)),
    );

    setTransactions(allTransactions);

    console.log("Transactions liées à ce paiement récurrent:", allTransactions);
  };

  const getConstant = async () => {
    const cats = await listeCategories();
    setCategories(
      cats
        .filter((c) => c.type === "event")
        .map((c) => ({ key: c.id, value: c.name })),
    );
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchTransactions();
      getConstant();
    }, []),
  );

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      key={item.id}
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        backgroundColor: color === "#FFFFFF" ? COLORS.dark : COLORS.secondary,
        padding: 10,
        borderRadius: 8,
        marginBottom: 8,
      }}
      onPress={
        () =>
          router.push({
            pathname: "/(screens)/DetailTransactions",
            params: {
              id: item.id,
              amount: item.amount,
              note: item.note,
              date: item.date,
              name: item.category_name,
              type: item.type,
              created_at: item.created_at,
            },
          })
        // console.log("Transaction details on press:", item)
      }
    >
      <View
        style={{
          backgroundColor: color === "#FFFFFF" ? COLORS.secondary : COLORS.dark,
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
            item.category_name?.toLowerCase().includes("alimentation")
              ? require("../../assets/images/diet.png")
              : item.category_name?.toLowerCase().includes("transport")
                ? require("../../assets/images/transportation.png")
                : item.category_name?.toLowerCase().includes("facture")
                  ? require("../../assets/images/bill.png")
                  : item.category_name?.toLowerCase().includes("abonnement")
                    ? require("../../assets/images/membership.png")
                    : item.category_name?.toLowerCase().includes("sante")
                      ? require("../../assets/images/pills.png")
                      : item.category_name?.toLowerCase().includes("loisirs")
                        ? require("../../assets/images/theater.png")
                        : item.category_name?.toLowerCase().includes("salaire")
                          ? require("../../assets/images/payroll.png")
                          : item.category_name?.toLowerCase().includes("depart")
                            ? require("../../assets/images/salary.png")
                            : item.category_name
                                  ?.toLowerCase()
                                  .includes("mission")
                              ? require("../../assets/images/mission.png")
                              : item.category_name
                                    ?.toLowerCase()
                                    .includes("famille")
                                ? require("../../assets/images/big-family.png")
                                : item.category_name
                                      ?.toLowerCase()
                                      .includes("education")
                                  ? require("../../assets/images/stack-of-books.png")
                                  : item.category_name
                                        ?.toLowerCase()
                                        .includes("shopping")
                                    ? require("../../assets/images/online-shopping.png")
                                    : item.category_name
                                          ?.toLowerCase()
                                          .includes("téléphone/internet")
                                      ? require("../../assets/images/iphone.png")
                                      : item.category_name
                                            ?.toLowerCase()
                                            .includes("soin")
                                        ? require("../../assets/images/lotions.png")
                                        : require("../../assets/images/shapes.png")
          }
          // tintColor={
          //   color === "#FFFFFF" ? COLORS.white : COLORS.dark
          // }
          style={{ width: 30, height: 30 }}
        />
      </View>

      <View style={{ width: 170, gap: 4 }}>
        <ThemedText
          style={{
            fontSize: 14,
            fontFamily: FONT_FAMILY.semibold,
          }}
          ellipsizeMode="tail"
          numberOfLines={1}
        >
          {item.note}
        </ThemedText>
        <ThemedText
          style={{
            fontSize: 12,
            fontFamily: FONT_FAMILY.medium,
          }}
        >
          {item.created_at.split(" ")[1]} ● {item.category_name}
        </ThemedText>
      </View>

      <ThemedText
        style={{
          fontSize: 14,
          fontFamily: FONT_FAMILY.semibold,
          // color:
          //   color === "#FFFFFF" ? COLORS.dark : COLORS.white,
        }}
      >
        {formatMoney(item.amount)} CFA
      </ThemedText>
    </TouchableOpacity>
  );

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteRecurringPayment(id);
      alert("Charge mensuelle supprimée avec succès !");
      router.back();
    } catch (error) {
      alert(
        "Une erreur est survenue lors de la suppression de la charge mensuelle.",
      );
    } finally {
      setLoading(false);
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
                      value: category_name || "Aucune",
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

                <View>
                  <TouchableOpacity
                    onPress={handleSave}
                    style={{
                      padding: 15,
                      backgroundColor: COLORS.primary,
                      borderRadius: 10,
                      alignItems: "center",
                      //   width: "45%",
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 14,
                      opacity: loading ? 0.7 : 1,
                    }}
                    disabled={loading}
                  >
                    <Text
                      style={{
                        color: COLORS.white,
                        fontFamily: FONT_FAMILY.bold,
                      }}
                    >
                      Enregistrer les modifications
                      {loading && <ActivityIndicator color={COLORS.white} />}
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
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 55,
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
              Détail du paiement
            </ThemedText>
          </View>

          <View
            style={{
              gap: 12,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 29,
            }}
          >
            <View
              style={{
                backgroundColor:
                  color === "#FFFFFF" ? COLORS.white : COLORS.dark,
                padding: 10,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                width: 100,
                height: 100,
              }}
            >
              <Image
                source={
                  name.toLowerCase().includes("netflix")
                    ? require("../../assets/images/netflix.png")
                    : name.toLowerCase().includes("loyer")
                      ? require("../../assets/images/3d-house.png")
                      : name.toLowerCase().includes("amazon")
                        ? require("../../assets/images/amazon.png")
                        : name.toLowerCase().includes("facture")
                          ? require("../../assets/images/bill.png")
                          : name.toLowerCase().includes("canca")
                            ? require("../../assets/images/canva.jpg")
                            : name.toLowerCase().includes("chatgpt")
                              ? require("../../assets/images/chatgpt.png")
                              : name.toLowerCase().includes("facebook")
                                ? require("../../assets/images/facebook.png")
                                : name.toLowerCase().includes("gemini")
                                  ? require("../../assets/images/gemini.jpg")
                                  : name.toLowerCase().includes("spotify")
                                    ? require("../../assets/images/spotify.png")
                                    : name.toLowerCase().includes("instagram")
                                      ? require("../../assets/images/instagram.png")
                                      : name.toLowerCase().includes("prime")
                                        ? require("../../assets/images/prime.png")
                                        : name.toLowerCase().includes("tiktok")
                                          ? require("../../assets/images/tiktok.png")
                                          : name
                                                .toLowerCase()
                                                .includes("upwork")
                                            ? require("../../assets/images/upwork.png")
                                            : name
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
            </View>
            <ThemedText
              style={{
                fontSize: 22,
                fontFamily: FONT_FAMILY.bold,
              }}
            >
              {name}
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 26,
                fontFamily: FONT_FAMILY.bold,
              }}
            >
              {formatMoney(amount)} CFA
            </ThemedText>

            <View
              style={{
                gap: 6,
                alignItems: "center",
                backgroundColor: COLORS.green + "20",
                padding: 12,
                borderRadius: 12,
                flexDirection: "row",
              }}
            >
              <MaterialCommunityIcons
                name="calendar-outline"
                size={24}
                color={COLORS.green}
              />
              <Text
                style={{ color: COLORS.green, fontFamily: FONT_FAMILY.medium }}
              >
                Prochain paiement dans {daysLate} jours
              </Text>
            </View>
          </View>

          <View>
            <BillingCycleCard
              nextDate={next_date}
              frequency={frequency}
              intervalCount={interval_count}
              //   customIntervalDays={customIntervalDays}
            />
          </View>

          <View
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor:
                color === "#FFFFFF" ? COLORS.dark : COLORS.secondary,
              gap: 12,
              marginBottom: 10,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                gap: 6,
                width: "45%",
                backgroundColor: COLORS.gray + "20",
                padding: 10,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
              >
                <MaterialIcons name="category" size={24} color={COLORS.green} />

                <ThemedText style={{ fontFamily: FONT_FAMILY.medium }}>
                  CATEGORIE
                </ThemedText>
              </View>
              <ThemedText
                style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16 }}
              >
                {category_name}
              </ThemedText>
            </View>
            <View
              style={{
                gap: 6,
                width: "45%",
                backgroundColor: COLORS.gray + "20",
                padding: 10,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
              >
                <MaterialIcons name="schedule" size={24} color={COLORS.green} />
                <ThemedText style={{ fontFamily: FONT_FAMILY.medium }}>
                  FREQUENCE
                </ThemedText>
              </View>
              <ThemedText
                style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16 }}
              >
                {frequency}
              </ThemedText>
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <ThemedText style={{ fontFamily: FONT_FAMILY.bold, fontSize: 20 }}>
              Historique des paiements
            </ThemedText>

            <FlatList
              data={transactions}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
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
                    style={{ fontFamily: FONT_FAMILY.regular, fontSize: 18 }}
                  >
                    Aucune transaction trouvée
                  </ThemedText>
                </View>
              )}
            />
          </View>
        </ScrollView>

        <View
          style={{
            padding: 12,
            backgroundColor: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            gap: 10,
          }}
        >
          <TouchableOpacity
            style={{
              padding: 15,
              backgroundColor: COLORS.primary,
              borderRadius: 10,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
              opacity: loading ? 0.7 : 1,
            }}
            onPress={() => openModal("incomingPaiementModal")}
          >
            <Feather name="edit" size={24} color={COLORS.white} />
            <Text
              style={{
                color: COLORS.white,
                fontFamily: FONT_FAMILY.medium,
                fontSize: 16,
              }}
            >
              Modifier les informations
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              padding: 15,
              backgroundColor: COLORS.red,
              borderRadius: 10,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
              opacity: loading ? 0.7 : 1,
            }}
            disabled={loading}
            onPress={() => {
              if (!loading && id) {
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
            <MaterialCommunityIcons
              name="delete"
              size={24}
              color={COLORS.white}
            />
            <Text
              style={{
                color: COLORS.white,
                fontFamily: FONT_FAMILY.medium,
                fontSize: 16,
              }}
            >
              Supprimer
            </Text>
            {loading && <ActivityIndicator color={COLORS.white} />}
          </TouchableOpacity>
        </View>
      </ThemedView>
      {incomingPaiementModal()}
    </SafeAreaView>
  );
};

export default DetailEvent;
