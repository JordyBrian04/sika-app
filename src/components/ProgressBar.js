import { COLORS } from "@/components/ui/color";
import { Ionicons } from "@expo/vector-icons"; // Ou une autre bibliothèque d'icônes
import { StyleSheet, Text, View } from "react-native";
import { color } from "../utils/colos";

const ProgressBar = ({ currentProgress }) => {
  const milestones = [10, 25, 50, 75, 100];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>JALONS DE PROGRESSION</Text>

      <View style={styles.container}>
        {/* Barre de fond (grise) */}
        <View style={styles.backgroundBar} />

        {/* Barre de progression (verte) */}
        <View style={[styles.progressBar, { width: `${currentProgress}%` }]} />

        {/* Affichage des points (Milestones) */}
        <View style={styles.milestonesContainer}>
          {milestones.map((milestone) => {
            const isCompleted = currentProgress >= milestone;

            return (
              <View key={milestone} style={styles.milestoneWrapper}>
                <View
                  style={[
                    styles.circle,
                    isCompleted
                      ? styles.circleCompleted
                      : styles.circleIncomplete,
                  ]}
                >
                  {isCompleted && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </View>
                <Text
                  style={[
                    styles.label,
                    isCompleted ? styles.labelActive : styles.labelInactive,
                  ]}
                >
                  {milestone}%
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: color === "#FFFFFF" ? COLORS.dark : COLORS.white,
    padding: 20,
    borderRadius: 25,
    margin: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8e9aaf",
    letterSpacing: 1.2,
    marginBottom: 30,
  },
  container: {
    height: 60,
    justifyContent: "center",
  },
  backgroundBar: {
    position: "absolute",
    height: 6,
    width: "100%",
    backgroundColor: "#f0f4f8",
    borderRadius: 3,
    top: "22%",
  },
  progressBar: {
    position: "absolute",
    height: 6,
    backgroundColor: "#28c71d", // Vert vif
    borderRadius: 3,
    top: "22%",
  },
  milestonesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  milestoneWrapper: {
    alignItems: "center",
    width: 40, // Largeur fixe pour centrer le texte sous le cercle
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    zIndex: 2,
  },
  circleCompleted: {
    backgroundColor: "#28c71d",
    borderColor: "#28c71d",
  },
  circleIncomplete: {
    borderColor: "#f0f4f8",
    backgroundColor: "white",
  },
  label: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "bold",
  },
  labelActive: {
    color: COLORS.green,
  },
  labelInactive: {
    color: "#bdc3c7",
  },
});

export default ProgressBar;
