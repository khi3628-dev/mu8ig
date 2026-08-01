"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  aiEnabled: boolean;
  soundOn: boolean;
  dailyGoal: number;
  setAiEnabled: (v: boolean) => void;
  setSoundOn: (v: boolean) => void;
  setDailyGoal: (v: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      aiEnabled: true,
      soundOn: true,
      dailyGoal: 1,
      setAiEnabled: (v) => set({ aiEnabled: v }),
      setSoundOn: (v) => set({ soundOn: v }),
      setDailyGoal: (v) => set({ dailyGoal: v }),
    }),
    {
      name: "mu8ig:settings",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
