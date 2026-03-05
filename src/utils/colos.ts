import { useThemeColor } from "@/hooks/use-theme-color";

export function useAppTextColor() {
  return useThemeColor({ light: "#000000", dark: "#FFFFFF" }, "text");
}
