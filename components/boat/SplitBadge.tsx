// 게이트를 지날 때 베스트 기록과의 차이 (초록 = 더 빠름)
export default function SplitBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const ahead = delta <= 0;
  return (
    <div
      className={`pointer-events-none absolute left-1/2 top-40 -translate-x-1/2 -skew-x-12 px-4 py-1 text-white shadow-lg ${
        ahead ? "bg-emerald-500" : "bg-rose-500"
      }`}
    >
      <div className="flex skew-x-12 items-baseline gap-2 font-black italic tabular-nums">
        <span className="text-[11px] tracking-[0.25em] opacity-80">BEST</span>
        <span className="text-2xl">
          {ahead ? "−" : "+"}
          {Math.abs(delta).toFixed(2)}
        </span>
      </div>
    </div>
  );
}
