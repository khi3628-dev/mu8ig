"use client";

import { useBetSlipStore } from "@/state/betSlipStore";
import { useHasMounted } from "@/lib/useHasMounted";
import { senToMyr } from "@/lib/currency";
import { BetSlipLineRow } from "./BetSlipLine";

export function BetSlip() {
  const mounted = useHasMounted();
  const lines = useBetSlipStore((s) => s.lines);
  const removeLine = useBetSlipStore((s) => s.removeLine);
  const clear = useBetSlipStore((s) => s.clear);

  const total = lines.reduce((acc, l) => acc + l.totalCostSen, 0);

  // Avoid SSR/hydration mismatch — render nothing until mounted.
  if (!mounted) {
    return (
      <aside className="rounded-lg border border-(--border) p-4">
        <div className="text-sm text-(--muted-foreground)">
          베팅 슬립 불러오는 중…
        </div>
      </aside>
    );
  }

  return (
    <aside className="rounded-lg border border-(--border) bg-(--background) flex flex-col">
      <header className="px-4 py-3 border-b border-(--border) flex items-center justify-between">
        <h2 className="font-semibold">베팅 슬립</h2>
        {lines.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-(--muted-foreground) underline underline-offset-2 hover:text-red-500"
          >
            모두 지우기
          </button>
        )}
      </header>

      <div className="px-4 py-3 space-y-2 flex-1 overflow-auto max-h-[50vh]">
        {lines.length === 0 ? (
          <div className="text-sm text-(--muted-foreground) text-center py-8">
            아직 추가된 선택이 없습니다.
            <br />
            번호를 고르고 &quot;슬립에 추가&quot; 해주세요.
          </div>
        ) : (
          lines.map((l) => (
            <BetSlipLineRow
              key={l.id}
              line={l}
              onRemove={() => removeLine(l.id)}
            />
          ))
        )}
      </div>

      <footer className="px-4 py-3 border-t border-(--border) space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-(--muted-foreground)">
            총 {lines.length}건
          </span>
          <span className="font-semibold text-lg">{senToMyr(total)}</span>
        </div>
        <button
          type="button"
          onClick={() => alert("실제 베팅은 Phase 4 (로그인/지갑) 이후 활성화됩니다.")}
          disabled={lines.length === 0}
          className="w-full inline-flex items-center justify-center rounded-md bg-(--brand) text-(--brand-foreground) px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          베팅하기 (Phase 4 로그인 필요)
        </button>
        <p className="text-[11px] text-(--muted-foreground) text-center">
          슬립은 브라우저에 저장됩니다. 실제 베팅은 이루어지지 않습니다.
        </p>
      </footer>
    </aside>
  );
}
