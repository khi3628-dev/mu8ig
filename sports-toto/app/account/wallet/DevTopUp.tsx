"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccountStore } from "@/state/accountStore";

const AMOUNTS = [10, 50, 100, 500]; // RM

export function DevTopUp() {
  const router = useRouter();
  const fetchMe = useAccountStore((s) => s.fetchMe);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function topUp(ringgit: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/wallet/dev-topup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountSen: ringgit * 100 }),
      });
      if (!res.ok) {
        setError("충전 실패 — 개발 모드에서만 사용 가능합니다.");
        setLoading(false);
        return;
      }
      await fetchMe();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-4">
      <div className="text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1">
        개발 모드 충전
      </div>
      <p className="text-sm mb-3">
        Phase 5 Stripe 테스트 결제 전까지 임시로 잔액을 올릴 수 있는 버튼입니다.
      </p>
      <div className="flex flex-wrap gap-2">
        {AMOUNTS.map((rm) => (
          <button
            key={rm}
            type="button"
            disabled={loading}
            onClick={() => topUp(rm)}
            className="inline-flex items-center rounded-md border border-(--border) bg-(--background) px-3 py-1.5 text-sm hover:bg-(--muted) disabled:opacity-50"
          >
            +RM {rm}
          </button>
        ))}
      </div>
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 mt-2">
          {error}
        </div>
      )}
    </section>
  );
}
