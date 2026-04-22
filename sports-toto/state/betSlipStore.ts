"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface BetSlipLine {
  id: string;
  gameId: string;
  gameSlug: string;
  gameName: string;
  gameKind: string;
  selection: unknown;
  betType: string;
  stakeSen: number;
  multiplier: number;
  totalCostSen: number;
  idempotencyKey: string;
  createdAt: number;
}

interface BetSlipState {
  lines: BetSlipLine[];
  hydrated: boolean;
  addLine: (line: Omit<BetSlipLine, "id" | "createdAt">) => void;
  removeLine: (id: string) => void;
  updateStake: (id: string, stakeSen: number) => void;
  clear: () => void;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const useBetSlipStore = create<BetSlipState>()(
  persist(
    (set) => ({
      lines: [],
      hydrated: false,
      addLine: (line) =>
        set((s) => ({
          lines: [
            ...s.lines,
            { ...line, id: newId(), createdAt: Date.now() },
          ],
        })),
      removeLine: (id) =>
        set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),
      updateStake: (id, stakeSen) =>
        set((s) => ({
          lines: s.lines.map((l) =>
            l.id === id
              ? {
                  ...l,
                  stakeSen,
                  totalCostSen: Math.max(0, stakeSen) * Math.max(1, l.multiplier),
                }
              : l,
          ),
        })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: "dtm:betslip",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
