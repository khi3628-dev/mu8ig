// 게이트를 지날 때 베스트 기록과의 차이 (초록 = 더 빠름)
export default function SplitBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const ahead = delta <= 0;
  return (
    <div
      className={`pointer-events-none absolute left-1/2 top-40 -translate-x-1/2 rounded-full px-4 py-1 text-xl font-black tabular-nums shadow ${
        ahead ? "bg-emerald-400 text-emerald-950" : "bg-rose-400 text-rose-950"
      }`}
    >
      👻 {ahead ? "−" : "+"}{Math.abs(delta).toFixed(2)}s
    </div>
  );
}
