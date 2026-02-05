import { create } from "zustand";

type ToastKind = "badge" | "info" | "error";

type ToastState = {
  visible: boolean;
  message: string;
  sub?: string;
  kind: ToastKind;
  show: (message: string, sub?: string, kind?: ToastKind) => void;
  hide: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: "",
  sub: undefined,
  kind: "info",
  show: (message, sub, kind = "info") =>
    set({ visible: true, message, sub, kind }),
  hide: () => set({ visible: false }),
}));
