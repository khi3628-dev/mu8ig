"use client";

import { senToMyr } from "@/lib/currency";
import type { BetSlipLine as Line } from "@/state/betSlipStore";
import type {
  FourDSelection,
  FourDJackpotSelection,
  FiveDSelection,
  SixDSelection,
  PickNofMSelection,
} from "@/lib/games/types";

function formatSelection(line: Line): string {
  const s = line.selection as unknown;
  switch (line.gameKind) {
    case "FOUR_D":
    case "FIVE_D":
    case "SIX_D":
      return (s as FourDSelection | FiveDSelection | SixDSelection).digits;
    case "FOUR_D_JACKPOT": {
      const j = s as FourDJackpotSelection;
      return `${j.digitsA} + ${j.digitsB}`;
    }
    case "PICK_N_OF_M":
      return (s as PickNofMSelection).numbers.join(" · ");
  }
  return JSON.stringify(s);
}

export function BetSlipLineRow({
  line,
  onRemove,
}: {
  line: Line;
  onRemove: () => void;
}) {
  return (
    <div className="border border-(--border) rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium truncate">{line.gameName}</div>
          <div className="text-[11px] text-(--muted-foreground) uppercase tracking-wider">
            {line.betType}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="이 선택 삭제"
          className="text-(--muted-foreground) hover:text-red-500 text-sm"
        >
          ✕
        </button>
      </div>
      <div className="font-mono text-sm break-all">{formatSelection(line)}</div>
      <div className="flex items-center justify-between text-xs text-(--muted-foreground)">
        <span>
          {senToMyr(line.stakeSen)} × {line.multiplier}
        </span>
        <span className="font-medium text-(--foreground)">
          {senToMyr(line.totalCostSen)}
        </span>
      </div>
    </div>
  );
}
