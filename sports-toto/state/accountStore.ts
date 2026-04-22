"use client";

import { create } from "zustand";

interface AccountState {
  walletBalanceSen: number | null;
  kycStatus: string | null;
  loading: boolean;
  fetchMe: () => Promise<void>;
  setBalance: (sen: number) => void;
  reset: () => void;
}

export const useAccountStore = create<AccountState>((set) => ({
  walletBalanceSen: null,
  kycStatus: null,
  loading: false,
  fetchMe: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/account/me", { cache: "no-store" });
      if (!res.ok) {
        set({ walletBalanceSen: null, kycStatus: null, loading: false });
        return;
      }
      const data = await res.json();
      set({
        walletBalanceSen: data.user.walletBalanceSen,
        kycStatus: data.user.kycStatus,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },
  setBalance: (sen) => set({ walletBalanceSen: sen }),
  reset: () => set({ walletBalanceSen: null, kycStatus: null }),
}));
