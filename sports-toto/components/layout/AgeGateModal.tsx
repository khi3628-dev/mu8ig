"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "dtm:ageConfirmed";

export function AgeGateModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "true") show();
    } catch {
      show();
    }
  }, []);

  if (!open) return null;

  function confirm() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  function leave() {
    window.location.href = "https://www.google.com";
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="max-w-md w-full rounded-xl bg-(--background) border border-(--border) p-6 shadow-2xl">
        <h2 id="age-gate-title" className="text-xl font-semibold mb-2">
          18세 이상인가요?
        </h2>
        <p className="text-sm text-(--muted-foreground) mb-6 leading-relaxed">
          본 사이트는 숫자 예측 게임 시뮬레이터입니다. 실제 베팅은 이루어지지
          않지만, 구성상 성인 전용으로 제공됩니다. 계속하려면 만 18세 이상임을
          확인해주세요.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={confirm}
            className="flex-1 inline-flex items-center justify-center rounded-md bg-(--brand) text-(--brand-foreground) px-4 py-2.5 text-sm font-medium hover:opacity-90 transition"
          >
            네, 18세 이상입니다
          </button>
          <button
            onClick={leave}
            className="flex-1 inline-flex items-center justify-center rounded-md border border-(--border) px-4 py-2.5 text-sm font-medium hover:bg-(--muted) transition"
          >
            아니오, 나가기
          </button>
        </div>
      </div>
    </div>
  );
}
