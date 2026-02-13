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
    })();

    const sub = registerRecurringNotificationResponseListener(() =>
      toYYYYMMDD(new Date()),
    );
    return () => sub.remove();
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
            </Stack>
            <Toast />
            <StatusBar style="auto" />
          </ThemeProvider>
        </Host>
      </GestureHandlerRootView>
    </UserInactivityProvider>
  );
}
