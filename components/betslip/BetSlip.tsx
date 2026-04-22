"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useBetSlipStore } from "@/state/betSlipStore";
import { useAccountStore } from "@/state/accountStore";
import { useHasMounted } from "@/lib/useHasMounted";
import { senToMyr } from "@/lib/currency";
import { BetSlipLineRow } from "./BetSlipLine";

export function BetSlip() {
  const mounted = useHasMounted();
  const router = useRouter();
  const { status } = useSession();
  const lines = useBetSlipStore((s) => s.lines);
  const removeLine = useBetSlipStore((s) => s.removeLine);
  const clear = useBetSlipStore((s) => s.clear);

  const balance = useAccountStore((s) => s.walletBalanceSen);
  const fetchMe = useAccountStore((s) => s.fetchMe);

  useEffect(() => {
    if (status === "authenticated") void fetchMe();
  }, [status, fetchMe]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = lines.reduce((acc, l) => acc + l.totalCostSen, 0);
  const insufficient =
    status === "authenticated" && balance != null && total > balance;

  if (!mounted) {
    return (
      <aside className="rounded-lg border border-(--border) p-4">
        <div className="text-sm text-(--muted-foreground)">
          베팅 슬립 불러오는 중…
        </div>
      </aside>
    );
  }

  async function handlePlaceBet() {
    setError(null);
    if (status !== "authenticated") {
      router.push("/auth/signin?callbackUrl=" + encodeURIComponent("/bet-slip"));
      return;
    }
    if (lines.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((l) => ({
            gameSlug: l.gameSlug,
            betType: l.betType,
            selection: l.selection,
            stakeSen: l.stakeSen,
            idempotencyKey: l.idempotencyKey,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "insufficient_funds") {
          setError("잔액이 부족합니다. 지갑에서 충전 후 다시 시도해주세요.");
        } else if (data.error === "no_open_draw") {
          setError("열려 있는 드로우가 없습니다.");
        } else if (data.error === "unauthorized") {
          router.push("/auth/signin");
        } else {
          setError("베팅 실패: " + (data.error ?? res.statusText));
        }
        return;
      }
      clear();
      await fetchMe();
      router.push("/account/bets");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const buttonLabel = (() => {
    if (submitting) return "처리 중...";
    if (status === "unauthenticated") return "로그인하고 베팅하기";
    if (status === "loading") return "로그인 상태 확인 중...";
    if (balance == null) return "잔액 확인 중...";
    if (insufficient) return "잔액 부족 — 충전 필요";
    return `베팅하기 (${senToMyr(total)})`;
  })();

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
        {status === "authenticated" && balance != null && (
          <div className="text-xs text-(--muted-foreground) flex justify-between">
            <span>지갑 잔액</span>
            <span
              className={
                insufficient ? "text-red-600 dark:text-red-400" : "text-(--foreground)"
              }
            >
              {senToMyr(balance)}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={handlePlaceBet}
          disabled={submitting || lines.length === 0 || insufficient}
          className="w-full inline-flex items-center justify-center rounded-md bg-(--brand) text-(--brand-foreground) px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {buttonLabel}
        </button>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
        <p className="text-[11px] text-(--muted-foreground) text-center">
          SIMULATION ONLY. 실제 금전 이동 없음.
        </p>
      </footer>
    </aside>
  );
}
