"use client";

// 화면을 그리다 실패했을 때 (주로 WebGL을 못 쓰는 기기). 저장 데이터는 그대로라 다시 시도하거나 2D로 이어서 하면 된다
import { getLocale, t } from "@/lib/boat/i18n";

export default function GameError({ reset, is3D }: { reset: () => void; is3D: boolean }) {
  const L = getLocale();
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-sky-900 p-6 text-center text-white">
      <div className="text-[11px] font-black tracking-[0.3em] text-amber-300">SOMETHING WENT WRONG</div>
      <h1 className="text-2xl font-black">{t(L, "errTitle")}</h1>
      <p className="max-w-sm text-sm text-sky-100">
        {is3D ? t(L, "err3D") : t(L, "err2D")}
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="-skew-x-12 bg-white px-6 py-2 font-black italic text-slate-950">
          <span className="inline-block skew-x-12">{t(L, "retry")}</span>
        </button>
        {is3D && (
          <a href="/boat" className="-skew-x-12 bg-amber-300 px-6 py-2 font-black italic text-slate-950">
            <span className="inline-block skew-x-12">{t(L, "play2D")}</span>
          </a>
        )}
      </div>
    </div>
  );
}
