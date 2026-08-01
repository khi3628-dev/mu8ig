"use client";

import { useProgressStore } from "@/app/state/progressStore";
import { useHasMounted } from "@/app/state/useHasMounted";
import { Flame } from "lucide-react";

export function StreakBadge() {
  const mounted = useHasMounted();
  const streak = useProgressStore((s) => s.streak.current);
  return (
    <div className="inline-flex items-center gap-1 h-9 px-3 rounded-full bg-[var(--brand-muted)] text-[var(--brand)] text-sm font-semibold">
      <Flame className="w-4 h-4" />
      {mounted ? streak : 0}
    </div>
  );
}
