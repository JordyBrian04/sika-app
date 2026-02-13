import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";

SplashScreen.preventAutoHideAsync().catch(() => {});

export function useAppFonts() {
  const [fontsLoaded] = useFonts({
    "Poppins-Regular": require("../../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Medium": require("../../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-SemiBold": require("../../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Bold": require("../../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-Thin": require("../../assets/fonts/Poppins-Thin.ttf"),
    "Poppins-Italic": require("../../assets/fonts/Poppins-Italic.ttf"),
  });

  // fallback si Android ne charge pas
  const [timeout, setTimeoutState] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimeoutState(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fontsLoaded || timeout) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, timeout]);

  return fontsLoaded || timeout;
}
