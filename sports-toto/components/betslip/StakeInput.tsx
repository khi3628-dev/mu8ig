"use client";

import { senToMyr } from "@/lib/currency";

const PRESETS = [100, 200, 500, 1000]; // sen

export function StakeInput({
  stakeSen,
  onChange,
  minStakeSen,
}: {
  stakeSen: number;
  onChange: (next: number) => void;
  minStakeSen: number;
}) {
  return (
    <div>
      <div className="text-xs text-(--muted-foreground) mb-1.5">
        단위 베팅 금액 (최소 {senToMyr(minStakeSen)})
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={
              "px-3 py-1.5 rounded-md border text-sm " +
              (stakeSen === p
                ? "bg-(--foreground) text-(--background) border-(--foreground)"
                : "border-(--border) hover:bg-(--muted)")
            }
          >
            {senToMyr(p)}
          </button>
        ))}
        <div className="inline-flex items-center gap-1">
          <span className="text-sm text-(--muted-foreground)">RM</span>
          <input
            type="number"
            min={minStakeSen / 100}
            step={1}
            value={stakeSen / 100}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              onChange(Math.max(minStakeSen, Math.round(v * 100)));
            }}
            className="w-24 rounded-md border border-(--border) bg-(--background) px-2 py-1.5 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
