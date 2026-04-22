"use client";

import { BET_TYPES, type GameKind } from "@/lib/games/types";

const LABELS: Record<string, string> = {
  BIG: "BIG",
  SMALL: "SMALL",
  IBOX: "iBox",
  SYSTEM: "System",
  ROLL: "Roll",
  STRAIGHT: "Straight",
  SYSTEM_ROLL: "System Roll",
};

const DESCRIPTIONS: Record<string, string> = {
  BIG: "1·2·3등 + Special(10) + Consolation(10) 모두 매칭",
  SMALL: "1·2·3등만 매칭, 상금 더 큼",
  IBOX: "순열 매칭 — 배수로 티켓 확장",
  SYSTEM: "한 자리 롤 — 10 티켓으로 확장",
  ROLL: "한 자리 R — 10 티켓으로 확장",
  STRAIGHT: "정확히 일치해야 당첨",
  SYSTEM_ROLL: "한 자리 롤 — 10 티켓으로 확장",
};

export function BetTypeSelector({
  kind,
  value,
  onChange,
}: {
  kind: GameKind;
  value: string;
  onChange: (next: string) => void;
}) {
  const types = BET_TYPES[kind];
  if (types.length <= 1) return null;

  return (
    <div>
      <div className="text-xs text-(--muted-foreground) mb-1.5">베팅 유형</div>
      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={
              "px-3 py-1.5 rounded-md border text-sm " +
              (value === t
                ? "bg-(--brand) text-(--brand-foreground) border-(--brand)"
                : "border-(--border) hover:bg-(--muted)")
            }
          >
            {LABELS[t] ?? t}
          </button>
        ))}
      </div>
      {DESCRIPTIONS[value] && (
        <p className="text-[11px] text-(--muted-foreground) mt-1.5">
          {DESCRIPTIONS[value]}
        </p>
      )}
    </div>
  );
}
