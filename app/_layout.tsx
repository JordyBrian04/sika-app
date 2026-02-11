import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { UserInactivityProvider } from "@/context/UserInactivity";
import { useColorScheme } from "@/hooks/use-color-scheme";
import Toast from "@/src/ui/components/Toast";
import { useEffect, useState } from "react";
import { migrate } from "../src/db";
import { registerRecurringNotificationResponseListener } from "../src/notifications/recurringHandlers";
import {
  ensureNotificationPermissions,
  rescheduleAllActiveRecurring,
  setupRecurringNotificationCategory,
} from "../src/notifications/recurringNotifications";
import { runRecurringCatchUp } from "../src/services/recurring/catchup";
import { toYYYYMMDD } from "../src/utils/date";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [ready, setReady] = useState(false);

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

  if (!ready) return null;

  return (
    <UserInactivityProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="(modals)/white"
            options={{ headerShown: false, animation: "none" }}
          />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <Toast />
        <StatusBar style="auto" />
      </ThemeProvider>
    </UserInactivityProvider>
  );
}
