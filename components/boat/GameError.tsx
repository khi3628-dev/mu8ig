"use client";

// 화면을 그리다 실패했을 때 (주로 WebGL을 못 쓰는 기기). 저장 데이터는 그대로라 다시 시도하거나 2D로 이어서 하면 된다
export default function GameError({ reset, is3D }: { reset: () => void; is3D: boolean }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-sky-900 p-6 text-center text-white">
      <div className="text-[11px] font-black tracking-[0.3em] text-amber-300">SOMETHING WENT WRONG</div>
      <h1 className="text-2xl font-black">화면을 불러오지 못했어요</h1>
      <p className="max-w-sm text-sm text-sky-100">
        {is3D ? "이 기기나 브라우저에서 3D 그래픽(WebGL)을 쓸 수 없을 수 있어요. 2D 버전은 같은 진행 상황으로 바로 이어서 할 수 있어요." : "잠시 후 다시 시도해 주세요. 진행 상황은 저장되어 있어요."}
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="-skew-x-12 bg-white px-6 py-2 font-black italic text-slate-950">
          <span className="inline-block skew-x-12">다시 시도</span>
        </button>
        {is3D && (
          <a href="/boat" className="-skew-x-12 bg-amber-300 px-6 py-2 font-black italic text-slate-950">
            <span className="inline-block skew-x-12">2D로 하기</span>
          </a>
        )}
      </div>
    </div>
  );
}
