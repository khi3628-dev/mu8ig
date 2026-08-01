"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  GeneratedSentence,
  StyleProfile,
} from "@/lib/learning/types";

interface Transcript {
  id: string;
  koText: string;
  createdAt: number;
}

interface VoiceStyleState {
  transcripts: Transcript[];
  profile: StyleProfile | null;
  lastGenerated: GeneratedSentence[];

  addTranscript: (koText: string) => void;
  clearTranscripts: () => void;
  setProfile: (p: StyleProfile | null) => void;
  setLastGenerated: (list: GeneratedSentence[]) => void;
  clearAll: () => void;
}

export const useVoiceStyleStore = create<VoiceStyleState>()(
  persist(
    (set, get) => ({
      transcripts: [],
      profile: null,
      lastGenerated: [],

      addTranscript: (koText) => {
        const next: Transcript = {
          id: `tr_${Date.now().toString(36)}`,
          koText,
          createdAt: Date.now(),
        };
        set({ transcripts: [next, ...get().transcripts].slice(0, 20) });
      },

      clearTranscripts: () => set({ transcripts: [] }),
      setProfile: (p) => set({ profile: p }),
      setLastGenerated: (list) => set({ lastGenerated: list }),
      clearAll: () =>
        set({ transcripts: [], profile: null, lastGenerated: [] }),
    }),
    {
      name: "mu8ig:voice-style",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
