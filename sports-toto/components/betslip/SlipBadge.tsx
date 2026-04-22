"use client";

import Link from "next/link";
import { useBetSlipStore } from "@/state/betSlipStore";
import { useHasMounted } from "@/lib/useHasMounted";

export function SlipBadge() {
  const mounted = useHasMounted();
  const count = useBetSlipStore((s) => s.lines.length);

  if (!mounted || count === 0) return null;

  return (
    <Link
      href="/bet-slip"
      aria-label={`베팅 슬립 (${count}건)`}
      className="relative inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-(--muted)"
    >
      <span aria-hidden="true">🎟️</span>
      <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-(--brand) text-(--brand-foreground) text-[11px] font-semibold inline-flex items-center justify-center">
        {count}
      </span>
    </Link>
  );
}
