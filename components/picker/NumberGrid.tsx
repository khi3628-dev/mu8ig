"use client";

export function NumberGrid({
  poolSize,
  pickCount,
  selected,
  onChange,
}: {
  poolSize: number;
  pickCount: number;
  selected: number[];
  onChange: (next: number[]) => void;
}) {
  function toggle(n: number) {
    if (selected.includes(n)) {
      onChange(selected.filter((x) => x !== n));
      return;
    }
    if (selected.length >= pickCount) return;
    onChange([...selected, n].sort((a, b) => a - b));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
        {Array.from({ length: poolSize }, (_, i) => i + 1).map((n) => {
          const on = selected.includes(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => toggle(n)}
              disabled={!on && selected.length >= pickCount}
              aria-pressed={on}
              className={
                "h-11 sm:h-10 w-full rounded-md font-mono text-sm tabular-nums transition border " +
                (on
                  ? "bg-(--brand) text-(--brand-foreground) border-(--brand)"
                  : "bg-(--background) border-(--border) hover:bg-(--muted) disabled:opacity-40 disabled:cursor-not-allowed")
              }
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-xs text-(--muted-foreground)">
        <span>
          {selected.length} / {pickCount} 선택됨
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="underline underline-offset-2 hover:text-(--foreground)"
          >
            모두 지우기
          </button>
        )}
      </div>
    </div>
  );
}
