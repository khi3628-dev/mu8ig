"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartOption {
  groupName: string;
  name: string;
  extraPriceWon: number;
}

export interface CartLine {
  id: string;
  menuItemId: string;
  name: string;
  unitPriceWon: number;
  quantity: number;
  options: CartOption[];
}

interface CartState {
  restaurantId: string | null;
  restaurantName: string | null;
  minOrderWon: number;
  deliveryFeeWon: number;
  lines: CartLine[];
  hydrated: boolean;
  addLine: (args: {
    restaurantId: string;
    restaurantName: string;
    minOrderWon: number;
    deliveryFeeWon: number;
    line: Omit<CartLine, "id">;
  }) => { ok: true } | { ok: false; reason: "DIFFERENT_RESTAURANT" };
  forceReplaceRestaurant: (args: {
    restaurantId: string;
    restaurantName: string;
    minOrderWon: number;
    deliveryFeeWon: number;
    line: Omit<CartLine, "id">;
  }) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      restaurantName: null,
      minOrderWon: 0,
      deliveryFeeWon: 0,
      lines: [],
      hydrated: false,
      addLine: (args) => {
        const s = get();
        if (s.restaurantId && s.restaurantId !== args.restaurantId && s.lines.length > 0) {
          return { ok: false, reason: "DIFFERENT_RESTAURANT" };
        }
        set({
          restaurantId: args.restaurantId,
          restaurantName: args.restaurantName,
          minOrderWon: args.minOrderWon,
          deliveryFeeWon: args.deliveryFeeWon,
          lines: [...s.lines, { ...args.line, id: newId() }],
        });
        return { ok: true };
      },
      forceReplaceRestaurant: (args) => {
        set({
          restaurantId: args.restaurantId,
          restaurantName: args.restaurantName,
          minOrderWon: args.minOrderWon,
          deliveryFeeWon: args.deliveryFeeWon,
          lines: [{ ...args.line, id: newId() }],
        });
      },
      updateQuantity: (lineId, quantity) =>
        set((s) => ({
          lines:
            quantity <= 0
              ? s.lines.filter((l) => l.id !== lineId)
              : s.lines.map((l) =>
                  l.id === lineId ? { ...l, quantity } : l,
                ),
        })),
      removeLine: (lineId) =>
        set((s) => ({ lines: s.lines.filter((l) => l.id !== lineId) })),
      clear: () =>
        set({
          restaurantId: null,
          restaurantName: null,
          minOrderWon: 0,
          deliveryFeeWon: 0,
          lines: [],
        }),
    }),
    {
      name: "baedal:cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        restaurantId: s.restaurantId,
        restaurantName: s.restaurantName,
        minOrderWon: s.minOrderWon,
        deliveryFeeWon: s.deliveryFeeWon,
        lines: s.lines,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export function lineTotalWon(line: CartLine): number {
  return line.unitPriceWon * line.quantity;
}

export function cartSubtotalWon(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + lineTotalWon(l), 0);
}
