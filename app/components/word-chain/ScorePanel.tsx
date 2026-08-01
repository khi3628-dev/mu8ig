"use client";

import { useEffect, useState } from "react";
import { Flame, Clock, Trophy } from "lucide-react";
import { useT } from "@/app/components/shared/T";

interface Props {
  score: number;
  combo: number;
  endsAt: number | null;
  onExpire: () => void;
}

export function ScorePanel({ score, combo, endsAt, onExpire }: Props) {
  const t = useT();
  const [remaining, setRemaining] = useState(() =>
    endsAt ? Math.max(0, endsAt - Date.now()) : 0,
  );

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const rem = Math.max(0, endsAt - Date.now());
      setRemaining(rem);
      if (rem <= 0) onExpire();
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [endsAt, onExpire]);

  const seconds = Math.ceil(remaining / 1000);
  const low = seconds <= 10;

  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat Icon={Trophy} label={t("wc.score")} value={String(score)} />
      <Stat Icon={Flame} label={t("wc.combo")} value={`x${combo}`} />
      <Stat
        Icon={Clock}
        label={t("wc.time")}
        value={endsAt ? `${seconds}s` : "–"}
        danger={low && !!endsAt}
      />
    </div>
  );
}

function Stat({
  Icon,
  label,
  value,
  danger,
}: {
  Icon: typeof Flame;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 text-center ${
        danger
          ? "border-[var(--danger)] bg-[var(--danger)]/10"
          : "border-[var(--border)] bg-[var(--card)]"
      }`}
    >
      <Icon
        className={`w-4 h-4 mx-auto ${
          danger ? "text-[var(--danger)]" : "text-[var(--muted-foreground)]"
        }`}
      />
      <div
        className={`text-xl font-bold mt-1 tabular-nums ${
          danger ? "text-[var(--danger)]" : ""
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] text-[var(--muted-foreground)]">{label}</div>
    </div>
  );
}
