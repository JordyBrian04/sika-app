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
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ensureAndroidChannels } from "@/src/notifications/channels";
import {
  scheduleEndOfDayNotification,
  setupEODCategory,
} from "@/src/notifications/eod";
import { registerEODNotificationListener } from "@/src/notifications/eodHandlers";
import { updateActivityAndStreak } from "@/src/services/gamification/daily";
import { getMinWeekly } from "@/src/services/goals/goalsRepo";
import Toast from "@/src/ui/components/Toast";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { migrate } from "../src/db";
import { registerRecurringNotificationResponseListener } from "../src/notifications/recurringHandlers";
import {
  ensureNotificationPermissions,
  rescheduleAllActiveRecurring,
  setupRecurringNotificationCategory,
} from "../src/notifications/recurringNotifications";
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
  let minWeekly = 0;

  useEffect(() => {
    migrate()
      .then(() => setReady(true))
      .catch((e) => {
        console.error("DB migrate error", e);
      });
  }, []);

  useEffect(() => {
    (async () => {
      await ensureNotificationPermissions();
      await setupRecurringNotificationCategory();
      await rescheduleAllActiveRecurring();
      await runRecurringCatchUp(toYYYYMMDD(new Date()));

      await ensureAndroidChannels();
      await setupEODCategory();
      await scheduleEndOfDayNotification(22, 0);

      await updateActivityAndStreak();

      minWeekly = await getMinWeekly();
    })();

    const sub = registerRecurringNotificationResponseListener(() =>
      toYYYYMMDD(new Date()),
    );

    const eodsub = registerEODNotificationListener(minWeekly);
    return () => {
      sub.remove();
      eodsub.remove();
    };
  }, []);

  if (!ready || !fontsLoaded) return null;

  return (
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
            </Stack>
            <Toast />
            <StatusBar style="auto" />
          </ThemeProvider>
        </Host>
      </GestureHandlerRootView>
    </UserInactivityProvider>
  );
}
