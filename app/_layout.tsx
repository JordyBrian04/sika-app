import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Host } from "react-native-portalize";
import "react-native-reanimated";

import { UserInactivityProvider } from "@/context/UserInactivity";
import { CurrencyProvider } from "@/src/context/CurrencyContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { enableAutoBackup, isAutoBackupEnabled } from "@/src/db/autoBackupTask";
import { ensureAndroidChannels } from "@/src/notifications/channels";
import {
  scheduleEndOfDayNotification,
  setupEODCategory,
} from "@/src/notifications/eod";
import { registerEODNotificationListener } from "@/src/notifications/eodHandlers";
import { updateActivityAndStreak } from "@/src/services/gamification/daily";
import { getMinWeekly } from "@/src/services/goals/goalsRepo";
import Toast from "@/src/ui/components/Toast";
import { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { migrate } from "../src/db";
import { registerRecurringNotificationResponseListener } from "../src/notifications/recurringHandlers";
import {
  ensureNotificationPermissions,
  rescheduleAllActiveRecurring,
  setupRecurringNotificationCategory,
} from "../src/notifications/recurringNotifications";
import { scheduleClosureReminder } from "../src/notifications/closureReminder";
import { checkBudgetControlBadges } from "../src/services/badges/badgeService";
import { runRecurringCatchUp } from "../src/services/recurring/catchup";
import { useAppFonts } from "../src/theme/useAppFonts";
import { toYYYYMMDD } from "../src/utils/date";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const fontsLoaded = useAppFonts();
  const minWeekly = useRef(0);

  useEffect(() => {
    migrate()
      .then(() => setReady(true))
      .catch((e) => {
        console.error("DB migrate error", e);
      });
  }, []);

  // ⚠️ Ce useEffect dépend de `ready` : il ne s'exécute qu'après que migrate()
  // ait terminé. Sans ça, les services qui lisent user_profile (updateActivityAndStreak,
  // checkBudgetControlBadges, etc.) crashent avec "no such table: user_profile".
  useEffect(() => {
    if (!ready) return;

    let sub: { remove: () => void } | null = null;
    let eodsub: { remove: () => void } | null = null;

    (async () => {
      await ensureNotificationPermissions();
      await setupRecurringNotificationCategory();
      await rescheduleAllActiveRecurring();
      await runRecurringCatchUp(toYYYYMMDD(new Date()));

      await ensureAndroidChannels();
      await setupEODCategory();
      await scheduleEndOfDayNotification(22, 0);
      await scheduleClosureReminder();

      await updateActivityAndStreak();

      // Vérifier les badges de contrôle budgétaire (mensuel, hebdo, 3 mois)
      try {
        await checkBudgetControlBadges();
      } catch (e) {
        console.warn("checkBudgetControlBadges failed:", e);
      }

      minWeekly.current = await getMinWeekly();

      const enabled = await isAutoBackupEnabled();
      if (!enabled) {
        try {
          await enableAutoBackup(2);
          console.log("✅ Auto-backup activé (tous les 3 jours)");
        } catch (error) {
          console.log("⚠️ Auto-backup non activé:", error);
        }
      }

      // Les listeners sont enregistrés ici, après que la DB soit prête
      sub = registerRecurringNotificationResponseListener(() =>
        toYYYYMMDD(new Date()),
      );
      eodsub = registerEODNotificationListener(minWeekly.current);
    })();

    return () => {
      sub?.remove();
      eodsub?.remove();
    };
  }, [ready]);

  if (!ready || !fontsLoaded) return null;

  return (
    <CurrencyProvider>
    <UserInactivityProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Host>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <Stack>
              <Stack.Screen
                name="index"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="(modals)/white"
                options={{
                  headerShown: false,
                  animation: "none",
                  gestureEnabled: false,
                }}
              />
              <Stack.Screen
                name="(tabs)"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="modal"
                options={{
                  presentation: "modal",
                  title: "Modal",
                  gestureEnabled: false,
                }}
              />
              <Stack.Screen
                name="(screens)/DetailBudget"
                options={{ headerShown: false, gestureEnabled: true }}
              />
              <Stack.Screen
                name="(screens)/DetailTransactions"
                options={{ headerShown: false, gestureEnabled: true }}
              />
              <Stack.Screen
                name="(screens)/ListeTransactions"
                options={{ headerShown: false, gestureEnabled: true }}
              />
              <Stack.Screen
                name="(screens)/IncomingEvent"
                options={{ headerShown: false, gestureEnabled: true }}
              />
              <Stack.Screen
                name="(screens)/DetailEvent"
                options={{ headerShown: false, gestureEnabled: true }}
              />
              <Stack.Screen
                name="(screens)/Categories"
                options={{ headerShown: false, gestureEnabled: true }}
              />
              <Stack.Screen
                name="(screens)/DetailGoal"
                options={{ headerShown: false, gestureEnabled: true }}
              />
              <Stack.Screen
                name="(screens)/ClotureMois"
                options={{ headerShown: false, gestureEnabled: true }}
              />
              <Stack.Screen
                name="(screens)/Profile"
                options={{ headerShown: false, gestureEnabled: true }}
              />
              <Stack.Screen
                name="(screens)/CloudSignup"
                options={{
                  headerShown: false,
                  gestureEnabled: true,
                  presentation: "modal",
                }}
              />
              <Stack.Screen
                name="(screens)/Paywall"
                options={{
                  headerShown: false,
                  gestureEnabled: true,
                  presentation: "modal",
                }}
              />
            </Stack>
            <Toast />
            <StatusBar style="auto" />
          </ThemeProvider>
        </Host>
      </GestureHandlerRootView>
    </UserInactivityProvider>
    </CurrencyProvider>
  );
}
