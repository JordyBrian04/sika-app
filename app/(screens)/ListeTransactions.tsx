import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { COLORS } from "@/components/ui/color";
import { useThemeColor } from "@/hooks/use-theme-color";
import SwipeableTransaction from "@/src/components/SwipeableTransaction";
import { CategoryInput, listeCategories } from "@/src/db/repositories/category";
import {
  deleteTransaction,
  editTransaction,
  listTransactions,
  TransactionRow,
} from "@/src/db/repositories/transactions";
import { FONT_FAMILY } from "@/src/theme/fonts";
import { useModalQueue } from "@/src/ui/components/useModalQueue";
import { formatMoney } from "@/src/utils/format";
import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

const ListeTransactions = () => {
  const color = useThemeColor({ light: "#000000", dark: "#FFFFFF" }, "text");
  const [open, setOpen] = useState(false);
  const [open2, setOpen2] = useState(false);
  const [date, setDate] = useState(new Date());
  const [date2, setDate2] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [periode, setPeriode] = useState({
    from: new Date().toISOString().substring(0, 10),
    to: new Date().toISOString().substring(0, 10),
  });
  const [selectedTab, setSelectedTab] = React.useState<
    "all" | "depense" | "entree"
  >("all");
  const [filtre, setFiltre] = useState<
    "today" | "this_week" | "this_month" | "period"
  >("today");
  const TAB = [
    { key: "all", label: "Toutes" },
    { key: "depense", label: "Dépenses" },
    { key: "entree", label: "Entrées" },
  ];
  const FILTRE = [
    { key: "today", label: "Aujourd'hui" },
    { key: "this_week", label: "Cette semaine" },
    { key: "this_month", label: "Ce mois" },
    { key: "period", label: "Période" },
  ];
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [OldTransactions, setOldTransactions] = React.useState<
    TransactionRow[]
  >([]);
  const { openModal, closeModal, isVisible } = useModalQueue();

  const handleTabPress = (key: "all" | "depense" | "entree") => {
    setSelectedTab(key);
  };
  const [transactionData, setTransactionData] = useState({
    amount: "0",
    category_id: 0,
    date: new Date().toISOString().substring(0, 10),
    note: "",
    recurring_id: null,
    type: "",
    id: 0,
  });
  const [categories, setCategories] = useState<
    { key: number; value: string }[]
  >([]);
  const [OldCategories, setOldCategories] = useState<CategoryInput[]>([]);
  const [open3, setOpen3] = useState(false);
  const [date3, setDate3] = useState(new Date());
  const [keyReset, setKeyReset] = useState(0);

  const handleFiltrePress = (
    key: "today" | "this_week" | "this_month" | "period",
  ) => {
    setFiltre(key);
    if (key === "period") {
      openModal("periodeModal");
    }
  };

  const getConstant = async () => {
    const cats = await listeCategories();
    console.log(cats);
    setOldCategories(cats);
    // setCategories(
    //   cats
    //     .filter((c) => c.type === option)
    //     .map((c) => ({ key: c.id, value: c.name })),
    // );
  };
  const toggleDatePicker3 = () => {
    setOpen2(!open3);
  };

  const toggleDatePicker = () => {
    setOpen(!open);
  };

  const toggleDatePicker2 = () => {
    setOpen2(!open2);
  };

  const onChange = ({ type }: any, selectedDate: any) => {
    if (type === "set") {
      const currentDate = selectedDate;
      setDate(currentDate);

      if (Platform.OS === "android") {
        toggleDatePicker();

        //On attribu la date à la valeur date (currentDate.toLocaleDateString('fr-FR'))
        setPeriode({
          ...periode,
          from: currentDate.toISOString().substring(0, 10),
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

  const onChange2 = ({ type }: any, selectedDate: any) => {
    if (type === "set") {
      const currentDate = selectedDate;
      setDate2(currentDate);

      if (Platform.OS === "android") {
        toggleDatePicker2();

        //On attribu la date à la valeur date (currentDate.toLocaleDateString('fr-FR'))
        setPeriode({
          ...periode,
          to: currentDate.toISOString().substring(0, 10),
        });
        // setTache({
        //   ...tache,
        //   date: currentDate.toLocaleDateString('fr-FR', options)
        // })
      }
    } else {
      toggleDatePicker2();
    }
  };

  const onChange3 = ({ type }: any, selectedDate: any) => {
    if (type === "set") {
      const currentDate = selectedDate;
      setDate3(currentDate);

      if (Platform.OS === "android") {
        toggleDatePicker3();

        //On attribu la date à la valeur date (currentDate.toLocaleDateString('fr-FR'))
        setTransactionData({
          ...transactionData,
          date: currentDate.toISOString().substring(0, 10),
        });
      }
    } else {
      toggleDatePicker3();
    }
  };

  const confirmIOSDate = () => {
    // console.log(date.toISOString().substring(0, 10));
    setPeriode({
      ...periode,
      from: date.toISOString().substring(0, 10),
    });
    toggleDatePicker();
  };

  const confirmIOSDate2 = () => {
    // console.log(date.toISOString().substring(0, 10));
    setPeriode({
      ...periode,
      to: date.toISOString().substring(0, 10),
    });
    toggleDatePicker2();
  };

  const confirmIOSDate3 = () => {
    // console.log(date.toISOString().substring(0, 10));
    setTransactionData({
      ...transactionData,
      date: date3.toISOString().substring(0, 10),
    });
    toggleDatePicker3();
  };

  const resetData = () => {
    setTransactionData({
      amount: "0",
      category_id: 0,
      date: new Date().toISOString().substring(0, 10),
      note: "",
      recurring_id: null,
      type: "",
      id: 0,
    });
    setKeyReset((prev) => prev + 1);
  };

  const groupTransactionsByDate = (transactions: any[]) => {
    const groups = transactions.reduce((acc: any, transaction: any) => {
      const date = transaction.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(transaction);
      return acc;
    }, {});

    // On transforme l'objet en tableau pour le rendu
    // et on calcule le solde du jour (entrées - dépenses)
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => {
        const data = groups[date];
        const dayBalance = data.reduce((sum: number, t: any) => {
          if (t.type === "entree") return sum + t.amount;
          if (t.type === "depense") return sum - t.amount;
          return sum;
        }, 0);
        return { date, data, dayBalance };
      });
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const allTransactions = await listTransactions(500); // Fetch more transactions for better filtering
      setOldTransactions(allTransactions);
      // Apply initial filter based on selected tab
      let filtered = allTransactions;

      if (filtre === "period") {
        setTransactions([]);
        return;
      }

      if (filtre === "today") {
        filtered = allTransactions.filter(
          (t) => t.date === new Date().toISOString().split("T")[0],
        );
      }

      if (filtre === "this_week") {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        filtered = allTransactions.filter((t) => {
          const transactionDate = new Date(t.date);
          return transactionDate >= startOfWeek && transactionDate <= endOfWeek;
        });
      }

      if (filtre === "this_month") {
        const startOfMonth = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1,
        );
        const endOfMonth = new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          0,
        );
        filtered = allTransactions.filter((t) => {
          const transactionDate = new Date(t.date);
          return (
            transactionDate >= startOfMonth && transactionDate <= endOfMonth
          );
        });
      }

      setTransactions(groupTransactionsByDate(filtered));
      console.log("Transactions chargées:", groupTransactionsByDate(filtered));
    } catch (error) {
      alert("Erreur de chargement des transactions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    // setLoading(true);
    fetchTransactions();
    getConstant();
    // setLoading(false);
  }, [filtre]);

  const handleFiltrerByPeriod = () => {
    setLoading(true);
    const { from, to } = periode;
    const filtered = OldTransactions.filter((t) => {
      return t.date >= from && t.date <= to;
    });
    setTransactions(groupTransactionsByDate(filtered));
    setLoading(false);
    closeModal();
  };

  const handleSearch = (query: string) => {
    const filtered = OldTransactions.filter((t) => {
      const noteMatch = t.note?.toLowerCase().includes(query.toLowerCase());
      const categoryMatch = t.category_name
        ?.toLowerCase()
        .includes(query.toLowerCase());
      return noteMatch || categoryMatch;
    });
    setTransactions(groupTransactionsByDate(filtered));
  };

  // const handleDelete = async (id: any) => {
  //   try {
  //     await deleteTransaction(id);
  //     alert("Supprimé avec succès!");
  //     fetchTransactions();
  //   } catch (error) {
  //     alert("Erreur de suppression");
  //     console.error("erreur suppression transaction ", error);
  //   }
  // };

  const handleSave = async () => {
    if (
      transactionData.type !== "event" &&
      (transactionData.amount === "0" || transactionData.category_id === 0)
    ) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setLoading(true);

    try {
      const res: any = await editTransaction({
        amount: parseInt(transactionData.amount),
        type: transactionData.type as any,
        category_id: transactionData.category_id,
        date: transactionData.date,
        note: transactionData.note,
        recurring_id: transactionData.recurring_id,
        id: transactionData.id,
      });

      if (parseInt(res) > 0) {
        resetData();
        fetchTransactions();
        closeModal();
      }
    } catch (error) {
      alert(
        "Une erreur est survenue lors de l'enregistrement de la transaction.",
      );
      console.error("Error saving transaction:", error);
    } finally {
      resetData();
      setLoading(false);
    }
  };

  const handleDelete = async (id: any) => {
    Alert.alert(
      "Suppression",
      "Voulez-vous vraiment supprimer cette transaction ?",
      [
        {
          text: "Oui",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTransaction(id);
              alert("Supprimé avec succès!");
              fetchTransactions();
            } catch (error) {
              alert("Erreur de suppression");
              console.error("erreur suppression transaction ", error);
            }
          },
        },
        { text: "Non", style: "cancel" },
      ],
    );
  };

  const handleEdit = async (trans: any) => {
    console.log(trans);
    setCategories(
      OldCategories.filter((c) => c.type === trans.type).map((c) => ({
        key: c.id,
        value: c.name,
      })),
    );
    setTransactionData({
      amount: trans.amount.toString(),
      category_id: trans.category_id,
      date: trans.date,
      note: trans.note,
      type: trans.type,
      recurring_id: null,
      id: trans.id,
    });
    setKeyReset((prev) => prev + 1);
    openModal("transactionModal");
    // toggleSheet();
  };
  function transactionModal() {
    return (
      <Modal
        visible={isVisible("transactionModal")}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
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
            behavior={Platform.OS == "ios" ? "padding" : "height"}
            style={{
              flex: 1,
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: "100%",
                backgroundColor:
                  color === "#FFFFFF" ? COLORS.dark : COLORS.white,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                position: "absolute",
                bottom: 0,
                paddingBottom: 70,
                gap: 20,
                //   alignItems: "center",
              }}
            >
              <View
                style={{
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ThemedText style={{ fontFamily: FONT_FAMILY.regular }}>
                  Montant (CFA)
                </ThemedText>
                <TextInput
                  placeholder="0"
                  keyboardType="numeric"
                  style={{
                    fontFamily: FONT_FAMILY.bold,
                    fontSize: 24,
                    width: "100%",
                    color: color,
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

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  // width: "100%",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
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
                  inputStyles={{
                    color: color,
                    fontFamily: FONT_FAMILY.regular,
                  }}
                  searchPlaceholder="Entrez une catégorie"
                  dropdownTextStyles={{
                    color: color,
                    fontFamily: FONT_FAMILY.regular,
                  }}
                  closeicon={<Ionicons name="close" size={18} color={color} />}
                  searchicon={
                    <Ionicons name="search" size={18} color={color} />
                  }
                  arrowicon={
                    <Feather name="chevron-down" size={24} color={color} />
                  }
                  save="key"
                  defaultOption={{
                    key: transactionData.category_id,
                    value:
                      categories.find(
                        (c) => c.key === transactionData.category_id,
                      )?.value || "",
                  }}
                />

                <View
                  style={
                    {
                      // flexDirection: "row",
                      // alignItems: "center",
                      // width: "70%",
                      // justifyContent: "space-between",
                    }
                  }
                >
                  {open3 && (
                    <DateTimePicker
                      mode="date"
                      display="spinner"
                      value={date3}
                      onChange={onChange3}
                      style={{
                        height: 120,
                        marginTop: 20,
                        width: "100%",
                      }}
                      textColor="#000"
                    />
                  )}

                  {open3 && Platform.OS === "ios" && (
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
                        onPress={toggleDatePicker3}
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
                        onPress={confirmIOSDate3}
                      >
                        <Text style={{ color: "black", fontWeight: "bold" }}>
                          Valider
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {!open3 && (
                    <TouchableOpacity onPress={toggleDatePicker3}>
                      <TextInput
                        placeholder="Date debut"
                        placeholderTextColor="#000"
                        style={{
                          borderWidth: 1,
                          borderColor: "gray",
                          padding: 10,
                          borderRadius: 10,
                          color: color,
                          height: 52,
                          width: 145,
                        }}
                        editable={false}
                        value={transactionData.date}
                        onChangeText={(e: any) =>
                          setTransactionData({
                            ...transactionData,
                            date: e,
                          })
                        }
                        onPressIn={toggleDatePicker3}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View>
                <ThemedText style={{ fontFamily: FONT_FAMILY.semibold }}>
                  Note
                </ThemedText>
                <TextInput
                  multiline
                  placeholder="Ajouter une note"
                  placeholderTextColor={color}
                  style={{
                    borderWidth: 1,
                    borderColor: "gray",
                    padding: 13,
                    borderRadius: 10,
                    color: color,
                    marginTop: 8,
                    textAlignVertical: "top",
                    height: 100,
                    fontFamily: FONT_FAMILY.regular,
                  }}
                  value={transactionData.note}
                  onChangeText={(e) =>
                    setTransactionData({ ...transactionData, note: e })
                  }
                />
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
                    padding: 10,
                    backgroundColor: COLORS.gray,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    width: "48%",
                  }}
                  onPress={closeModal}
                >
                  <Text
                    style={{
                      color: COLORS.dark,
                      fontFamily: FONT_FAMILY.semibold,
                    }}
                  >
                    Annuler
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    padding: 10,
                    backgroundColor: COLORS.green,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    width: "48%",
                    opacity: loading ? 0.7 : 1,
                  }}
                  disabled={loading}
                  onPress={handleSave}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text
                      style={{
                        color: COLORS.white,
                        fontFamily: FONT_FAMILY.semibold,
                      }}
                    >
                      Enregistrer
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  }

  function periodeModal() {
    return (
      <Modal
        visible={isVisible("periodeModal")}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
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
              //   alignItems: "center",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: FONT_FAMILY.semibold,
                  //   marginBottom: 20,
                }}
              >
                Sélectionnez une période
              </Text>
              <TouchableOpacity
                style={{
                  padding: 10,
                  backgroundColor: COLORS.secondary,
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={closeModal}
              >
                <MaterialCommunityIcons
                  name="close-thick"
                  size={24}
                  color="black"
                />
              </TouchableOpacity>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <View style={{ width: "45%" }}>
                <Text style={{ fontSize: 16, fontFamily: FONT_FAMILY.regular }}>
                  Date de début
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
                          color: "#000",
                          fontFamily: FONT_FAMILY.regular,
                          height: 52,
                          width: "100%",
                        }}
                        editable={false}
                        value={periode.from}
                        onChangeText={(e: any) =>
                          setPeriode({
                            ...periode,
                            from: e,
                          })
                        }
                        onPressIn={toggleDatePicker}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={{ width: "45%" }}>
                <Text style={{ fontSize: 16, fontFamily: FONT_FAMILY.regular }}>
                  Date de fin
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
                  {open2 && (
                    <DateTimePicker
                      mode="date"
                      display="spinner"
                      value={date2}
                      onChange={onChange2}
                      style={{
                        height: 120,
                        marginTop: 20,
                        width: "100%",
                      }}
                      textColor="#000"
                    />
                  )}

                  {open2 && Platform.OS === "ios" && (
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
                        onPress={toggleDatePicker2}
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
                        onPress={confirmIOSDate2}
                      >
                        <Text style={{ color: "black", fontWeight: "bold" }}>
                          Valider
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {!open2 && (
                    <TouchableOpacity onPress={toggleDatePicker2}>
                      <TextInput
                        placeholder="Date de fin"
                        placeholderTextColor="#000"
                        style={{
                          borderWidth: 1,
                          borderColor: "gray",
                          padding: 10,
                          borderRadius: 10,
                          color: "#000",
                          fontFamily: FONT_FAMILY.regular,
                          height: 52,
                          width: "100%",
                        }}
                        editable={false}
                        value={periode.to}
                        onChangeText={(e: any) =>
                          setPeriode({
                            ...periode,
                            to: e,
                          })
                        }
                        onPressIn={toggleDatePicker2}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 12,
                backgroundColor: COLORS.primary,
                justifyContent: "center",
                borderRadius: 10,
              }}
              onPress={handleFiltrerByPeriod}
            >
              <MaterialCommunityIcons name="filter" size={24} color="white" />
              <Text
                style={{
                  color: COLORS.white,
                  fontFamily: FONT_FAMILY.semibold,
                }}
              >
                Filtrer sur la période
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={{ flex: 1, padding: 20, gap: 22 }}>
        {/* <ScrollView
          style={{ flex: 1, padding: 20 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 22, paddingBottom: 100 }}
        > */}
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
            Liste des transactions
          </ThemedText>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: color,
            borderRadius: 8,
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
            onChangeText={handleSearch}
            returnKeyType="search"
          />
        </View>

        {/* <View
          style={{
            alignItems: "center",
            justifyContent: "space-between",
            flexDirection: "row",
            width: "100%",
          }}
        >
          {TAB.map((tab: any) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handleTabPress(tab.key)}
              style={{
                padding: 10,
                backgroundColor:
                  selectedTab === tab.key ? COLORS.primary : COLORS.secondary,
                borderRadius: 22,
                width: "30%",
                alignItems: "center",
              }}
            >
              <ThemedText
                style={{
                  fontSize: 16,
                  fontFamily: FONT_FAMILY.bold,
                  color: selectedTab === tab.key ? COLORS.white : COLORS.dark,
                }}
              >
                {tab.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View> */}

        <View
          style={{
            alignItems: "center",
            justifyContent: "space-between",
            flexDirection: "row",
            width: "100%",
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingVertical: 10 }}
          >
            {FILTRE.map((filtreOption: any) => (
              <TouchableOpacity
                key={filtreOption.key}
                onPress={() => handleFiltrePress(filtreOption.key)}
                style={{
                  padding: 10,
                  backgroundColor:
                    filtre === filtreOption.key
                      ? COLORS.primary
                      : COLORS.secondary,
                  borderRadius: 22,
                }}
              >
                <ThemedText
                  style={{
                    fontSize: 16,
                    fontFamily: FONT_FAMILY.bold,
                    color:
                      filtre === filtreOption.key ? COLORS.white : COLORS.dark,
                  }}
                >
                  {filtreOption.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchTransactions}
            />
          }
        >
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.date}
            renderItem={({ item }) => (
              <View style={{ marginBottom: 20 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: FONT_FAMILY.medium,
                      fontSize: 16,
                      color: "#888",
                    }}
                  >
                    {item.date === new Date().toISOString().split("T")[0]
                      ? "Aujourd'hui"
                      : new Date(item.date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                        })}
                  </Text>
                  <Text
                    style={{
                      fontFamily: FONT_FAMILY.semibold,
                      fontSize: 14,
                      color:
                        item.dayBalance > 0
                          ? "#34C759"
                          : item.dayBalance < 0
                            ? "#FF3B30"
                            : "#888",
                    }}
                  >
                    {item.dayBalance > 0 ? "+" : ""}
                    {formatMoney(String(item.dayBalance))} FCFA
                  </Text>
                </View>

                {item.data.map((trans: any) => (
                  <SwipeableTransaction
                    key={trans.id}
                    trans={trans}
                    onPress={(id: any) => handleDelete(id)}
                    onPressEdit={(id: any) => handleEdit(id)}
                  />
                  // <TouchableOpacity
                  //   key={trans.id}
                  //   style={{
                  //     flexDirection: "row",
                  //     justifyContent: "space-around",
                  //     alignItems: "center",
                  //     backgroundColor:
                  //       color === "#FFFFFF" ? COLORS.dark : COLORS.secondary,
                  //     padding: 10,
                  //     borderRadius: 8,
                  //     marginBottom: 8,
                  //   }}
                  //   onPress={
                  //     () =>
                  //       router.push({
                  //         pathname: "/(screens)/DetailTransactions",
                  //         params: {
                  //           id: trans.id,
                  //           amount: trans.amount,
                  //           note: trans.note,
                  //           date: trans.date,
                  //           name: trans.category_name,
                  //           type: trans.type,
                  //           created_at: trans.created_at,
                  //         },
                  //       })
                  //   }
                  //   onLongPress={() =>
                  //     Alert.alert(
                  //       "Suppression",
                  //       "Voulez-vous vraiment supprimer cette transaction ?",
                  //       [
                  //         {
                  //           text: "Oui",
                  //           onPress: () => handleDelete(trans.id),
                  //           style: "destructive",
                  //         },
                  //         { text: "Non", style: "cancel" },
                  //       ],
                  //     )
                  //   }
                  // >
                  //   <View
                  //     style={{
                  //       backgroundColor:
                  //         color === "#FFFFFF" ? COLORS.secondary : COLORS.dark,
                  //       padding: 15,
                  //       borderRadius: 8,
                  //       flexDirection: "row",
                  //       alignItems: "center",
                  //       gap: 15,
                  //       width: 50,
                  //       justifyContent: "center",
                  //       height: 50,
                  //     }}
                  //   >
                  //     <Image
                  //       source={
                  //         trans.category_name
                  //           ?.toLowerCase()
                  //           .includes("alimentation")
                  //           ? require("../../assets/images/diet.png")
                  //           : trans.category_name
                  //                 ?.toLowerCase()
                  //                 .includes("transport")
                  //             ? require("../../assets/images/transportation.png")
                  //             : trans.category_name
                  //                   ?.toLowerCase()
                  //                   .includes("facture")
                  //               ? require("../../assets/images/bill.png")
                  //               : trans.category_name
                  //                     ?.toLowerCase()
                  //                     .includes("abonnement")
                  //                 ? require("../../assets/images/membership.png")
                  //                 : trans.category_name
                  //                       ?.toLowerCase()
                  //                       .includes("sante")
                  //                   ? require("../../assets/images/pills.png")
                  //                   : trans.category_name
                  //                         ?.toLowerCase()
                  //                         .includes("loisirs")
                  //                     ? require("../../assets/images/theater.png")
                  //                     : trans.category_name
                  //                           ?.toLowerCase()
                  //                           .includes("salaire")
                  //                       ? require("../../assets/images/payroll.png")
                  //                       : trans.category_name
                  //                             ?.toLowerCase()
                  //                             .includes("depart")
                  //                         ? require("../../assets/images/salary.png")
                  //                         : trans.category_name
                  //                               ?.toLowerCase()
                  //                               .includes("mission")
                  //                           ? require("../../assets/images/mission.png")
                  //                           : trans.category_name
                  //                                 ?.toLowerCase()
                  //                                 .includes("famille")
                  //                             ? require("../../assets/images/big-family.png")
                  //                             : trans.category_name
                  //                                   ?.toLowerCase()
                  //                                   .includes("education")
                  //                               ? require("../../assets/images/stack-of-books.png")
                  //                               : trans.category_name
                  //                                     ?.toLowerCase()
                  //                                     .includes("shopping")
                  //                                 ? require("../../assets/images/online-shopping.png")
                  //                                 : trans.category_name
                  //                                       ?.toLowerCase()
                  //                                       .includes(
                  //                                         "téléphone/internet",
                  //                                       )
                  //                                   ? require("../../assets/images/iphone.png")
                  //                                   : trans.category_name
                  //                                         ?.toLowerCase()
                  //                                         .includes("soin")
                  //                                     ? require("../../assets/images/lotions.png")
                  //                                     : require("../../assets/images/shapes.png")
                  //       }
                  //       style={{ width: 30, height: 30 }}
                  //     />
                  //   </View>

                  //   <View style={{ width: 170, gap: 4 }}>
                  //     <ThemedText
                  //       style={{
                  //         fontSize: 14,
                  //         fontFamily: FONT_FAMILY.semibold,
                  //       }}
                  //       ellipsizeMode="tail"
                  //       numberOfLines={1}
                  //     >
                  //       {trans.note}
                  //     </ThemedText>
                  //     <ThemedText
                  //       style={{
                  //         fontSize: 12,
                  //         fontFamily: FONT_FAMILY.medium,
                  //       }}
                  //     >
                  //       {trans.created_at.split(" ")[1]} ● {trans.category_name}
                  //     </ThemedText>
                  //   </View>

                  //   <ThemedText
                  //     style={{
                  //       fontSize: 14,
                  //       fontFamily: FONT_FAMILY.semibold,
                  //     }}
                  //   >
                  //     {formatMoney(trans.amount)} CFA
                  //   </ThemedText>
                  // </TouchableOpacity>
                ))}
              </View>
            )}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
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
                  Aucune transaction
                </ThemedText>
              </View>
            )}
          />
        </ScrollView>
        {/* </ScrollView> */}
      </ThemedView>
      {periodeModal()}
      {transactionModal()}
    </SafeAreaView>
  );
};

export default ListeTransactions;
