import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

// react-native-mmkv requiert un dev build (NitroModules).
// On le charge dynamiquement pour éviter un crash sur Expo Go.
let storage: { getNumber: (k: string) => number | undefined; set: (k: string, v: number) => void } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createMMKV } = require("react-native-mmkv");
  storage = createMMKV({ id: "userInactivity" });
} catch {
  // Expo Go ou environnement sans NitroModules → inactivité désactivée
  console.warn("⚠️ MMKV non disponible : verrouillage par inactivité désactivé (utilise un dev build)");
}

const LOCK_TIME = 3000;

export const UserInactivityProvider = ({ children }: any) => {
  const appState = useRef(AppState.currentState);
  const router = useRouter();

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState: any) => {
    console.log("AppState changed to", appState.current, nextAppState);

    if (nextAppState === "inactive") {
      router.push("/(modals)/white");
    } else {
      if (router.canGoBack()) {
        router.back();
      }
    }

    if (nextAppState === "background") {
      recordStartTime();
    } else if (
      nextAppState === "active" &&
      appState.current.match(/background/)
    ) {
      const elapsed = Date.now() - (storage?.getNumber("startTime") || 0);
      if (elapsed >= LOCK_TIME) {
        router.push("/");
      }
    }

    appState.current = nextAppState;
  };

  const recordStartTime = () => {
    storage?.set("startTime", Date.now());
  };

  return children;
};
