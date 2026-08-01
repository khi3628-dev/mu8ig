"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Locale } from "@/lib/learning/types";

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggle: () => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: "ko",
      setLocale: (l) => set({ locale: l }),
      toggle: () => set({ locale: get().locale === "ko" ? "en" : "ko" }),
    }),
    {
      name: "mu8ig:locale",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
