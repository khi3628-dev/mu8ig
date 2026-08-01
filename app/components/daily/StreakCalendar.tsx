"use client";

import { useMemo } from "react";
import { useProgressStore } from "@/app/state/progressStore";
import { useHasMounted } from "@/app/state/useHasMounted";
import { addDaysISO, todayISO } from "@/lib/learning/daily/streak";
import { cn } from "@/lib/learning/cn";

export function StreakCalendar({ days = 28 }: { days?: number }) {
  const mounted = useHasMounted();
  const history = useProgressStore((s) => s.dailyHistory);
  const today = todayISO();

  const cells = useMemo(() => {
    const list: { iso: string; active: boolean; isToday: boolean }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const iso = addDaysISO(today, -i);
      list.push({
        iso,
        active: mounted && Boolean(history[iso]?.challengeCompleted),
        isToday: iso === today,
      });
    }
    return list;
  }, [days, today, mounted, history]);

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {cells.map(({ iso, active, isToday }) => (
        <div
          key={iso}
          title={iso}
          className={cn(
            "aspect-square rounded-md",
            active
              ? "bg-[var(--brand)]"
              : "bg-[var(--muted)] border border-[var(--border)]",
            isToday && "ring-2 ring-[var(--accent)]",
          )}
        />
      ))}
    </div>
  );
}
