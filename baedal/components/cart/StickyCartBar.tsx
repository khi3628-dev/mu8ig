"use client";

import Link from "next/link";
import { useCartStore, cartSubtotalWon } from "@/state/cartStore";
import { useHasMounted } from "@/lib/useHasMounted";
import { formatWon } from "@/lib/won";
import { ShoppingBag } from "lucide-react";

export function StickyCartBar({ restaurantId }: { restaurantId?: string }) {
  const mounted = useHasMounted();
  const lines = useCartStore((s) => s.lines);
  const cartRestaurantId = useCartStore((s) => s.restaurantId);
  const minOrderWon = useCartStore((s) => s.minOrderWon);

  if (!mounted) return null;
  if (lines.length === 0) return null;
  if (restaurantId && cartRestaurantId !== restaurantId) return null;

  const subtotal = cartSubtotalWon(lines);
  const qty = lines.reduce((s, l) => s + l.quantity, 0);
  const short = minOrderWon - subtotal;

  return (
    <div className="fixed bottom-14 left-0 right-0 z-20 pointer-events-none px-4 pb-3">
      <Link
        href="/cart"
        className="pointer-events-auto mx-auto max-w-5xl flex items-center gap-3 bg-(--brand) text-(--brand-foreground) rounded-xl px-4 h-14 shadow-lg hover:opacity-95"
      >
        <span className="relative">
          <ShoppingBag className="w-5 h-5" />
          <span className="absolute -top-2 -right-2 bg-(--accent) text-black text-xs font-bold rounded-full w-5 h-5 grid place-items-center">
            {qty}
          </span>
        </span>
        <span className="flex-1 font-semibold">
          {short > 0
            ? `${formatWon(short)} 더 담으면 주문 가능`
            : "장바구니 보기"}
        </span>
        <span className="font-bold">{formatWon(subtotal)}</span>
      </Link>
    </div>
  );
}
