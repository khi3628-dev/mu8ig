"use client";

import { useEffect, useState } from "react";

function fmt(totalMs: number): string {
  if (totalMs <= 0) return "마감됨";
  const totalSec = Math.floor(totalMs / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}일 ${h}시간 ${m}분`;
  if (h > 0) return `${h}시간 ${m}분 ${s}초`;
  return `${m}분 ${s}초`;
}

export function DrawCountdown({
  targetISO,
  label = "다음 드로우 마감",
}: {
  targetISO: string;
  label?: string;
}) {
  const target = new Date(targetISO).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Avoid hydration mismatch — render static "—" on server and first paint.
  const display = now == null ? "—" : fmt(target - now);

  return (
    <div className="inline-flex items-baseline gap-2">
      <span className="text-xs text-(--muted-foreground)">{label}</span>
      <span className="font-mono font-medium tabular-nums">{display}</span>
    </div>
  );
}
