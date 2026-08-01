"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ChainEntry } from "@/lib/learning/types";

interface WordChainState {
  running: boolean;
  chain: ChainEntry[];
  score: number;
  combo: number;
  startedAt: number | null;
  durationMs: number;
  endsAt: number | null;

  startGame: (durationMs?: number) => void;
  endGame: () => void;
  addWord: (entry: ChainEntry) => void;
  bumpCombo: () => void;
  resetCombo: () => void;
  reset: () => void;
}

const DEFAULT_DURATION = 60_000;

export const useWordChainStore = create<WordChainState>()(
  persist(
    (set, get) => ({
      running: false,
      chain: [],
      score: 0,
      combo: 0,
      startedAt: null,
      durationMs: DEFAULT_DURATION,
      endsAt: null,

      startGame: (durationMs = DEFAULT_DURATION) => {
        const now = Date.now();
        set({
          running: true,
          chain: [],
          score: 0,
          combo: 0,
          startedAt: now,
          durationMs,
          endsAt: now + durationMs,
        });
      },

      endGame: () => set({ running: false, endsAt: null }),

      addWord: (entry) =>
        set({
          chain: [...get().chain, entry],
          score: get().score + entry.scoreDelta,
        }),

      bumpCombo: () => set({ combo: get().combo + 1 }),
      resetCombo: () => set({ combo: 0 }),

      reset: () =>
        set({
          running: false,
          chain: [],
          score: 0,
          combo: 0,
          startedAt: null,
          durationMs: DEFAULT_DURATION,
          endsAt: null,
        }),
    }),
    {
      name: "mu8ig:word-chain-run",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
