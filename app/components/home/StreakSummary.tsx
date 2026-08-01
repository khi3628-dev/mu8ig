"use client";

import { Flame, Trophy, Layers } from "lucide-react";
import { useProgressStore } from "@/app/state/progressStore";
import { useHasMounted } from "@/app/state/useHasMounted";
import { useT } from "@/app/components/shared/T";

export function StreakSummary() {
  const mounted = useHasMounted();
  const t = useT();
  const streak = useProgressStore((s) => s.streak.current);
  const best = useProgressStore((s) => s.bestScores.wordChain);
  const srsSize = useProgressStore((s) =>
    Object.keys(s.flashcardSRS).length,
  );

  const items: { Icon: typeof Flame; label: string; value: string }[] = [
    {
      Icon: Flame,
      label: t("home.stats.streak"),
      value: mounted ? String(streak) : "–",
    },
    {
      Icon: Trophy,
      label: t("home.stats.wordChain"),
      value: mounted ? String(best) : "–",
    },
    {
      Icon: Layers,
      label: t("home.stats.cards"),
      value: mounted ? String(srsSize) : "–",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ Icon, label, value }) => (
        <div
          key={label}
          className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-3 text-center"
        >
          <Icon className="w-4 h-4 mx-auto text-[var(--muted-foreground)]" />
          <div className="text-lg font-bold mt-1 tabular-nums">{value}</div>
          <div className="text-[11px] text-[var(--muted-foreground)] truncate">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
