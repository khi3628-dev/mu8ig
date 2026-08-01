"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  DailyHistoryEntry,
  GeneratedSentence,
  SRSEntry,
  StreakState,
} from "@/lib/learning/types";
import { nextStreak, todayISO } from "@/lib/learning/daily/streak";

interface ProgressState {
  streak: StreakState;
  dailyHistory: Record<string, DailyHistoryEntry>;
  bestScores: { wordChain: number };
  flashcardSRS: Record<string, SRSEntry>;
  savedSentences: GeneratedSentence[];

  recordDailyCompletion: (today?: string) => void;
  recordDaily: (
    fields: DailyHistoryEntry,
    today?: string,
  ) => void;
  updateBestScore: (game: "wordChain", score: number) => void;
  upsertSRS: (id: string, entry: SRSEntry) => void;
  removeSRS: (id: string) => void;
  addSavedSentence: (s: GeneratedSentence) => void;
  removeSavedSentence: (id: string) => void;
  reset: () => void;
}

const initial = {
  streak: { current: 0, longest: 0, lastCompletedISODate: null },
  dailyHistory: {},
  bestScores: { wordChain: 0 },
  flashcardSRS: {},
  savedSentences: [] as GeneratedSentence[],
};

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initial,

      recordDailyCompletion: (today) => {
        const iso = today ?? todayISO();
        const prev = get().streak;
        const next = nextStreak(prev, iso);
        set({
          streak: next,
          dailyHistory: {
            ...get().dailyHistory,
            [iso]: {
              ...(get().dailyHistory[iso] ?? {}),
              challengeCompleted: true,
            },
          },
        });
      },

      recordDaily: (fields, today) => {
        const iso = today ?? todayISO();
        set({
          dailyHistory: {
            ...get().dailyHistory,
            [iso]: { ...(get().dailyHistory[iso] ?? {}), ...fields },
          },
        });
      },

      updateBestScore: (game, score) => {
        const cur = get().bestScores[game] ?? 0;
        if (score > cur) {
          set({ bestScores: { ...get().bestScores, [game]: score } });
        }
      },

      upsertSRS: (id, entry) =>
        set({ flashcardSRS: { ...get().flashcardSRS, [id]: entry } }),

      removeSRS: (id) => {
        const s = { ...get().flashcardSRS };
        delete s[id];
        set({ flashcardSRS: s });
      },

      addSavedSentence: (s) =>
        set({ savedSentences: [s, ...get().savedSentences].slice(0, 100) }),

      removeSavedSentence: (id) =>
        set({
          savedSentences: get().savedSentences.filter((x) => x.id !== id),
        }),

      reset: () => set({ ...initial }),
    }),
    {
      name: "mu8ig:progress",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
