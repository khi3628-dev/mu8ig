import Link from "next/link";
import { DrawResultDisplay } from "./DrawResultDisplay";

type DrawItem = {
  id: string;
  drawNumber: string;
  scheduledAt: Date | string;
  status: string;
  results: string | null;
  game: { slug: string; name: string; nameKo: string | null; kind: string };
};

function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function ResultsList({ draws }: { draws: DrawItem[] }) {
  if (draws.length === 0) {
    return (
      <div className="text-sm text-(--muted-foreground) p-4 border border-dashed border-(--border) rounded-lg text-center">
        아직 결과가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {draws.map((d) => {
        const parsed = d.results ? JSON.parse(d.results) : null;
        return (
          <div
            key={d.id}
            className="rounded-lg border border-(--border) p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <Link
                  href={`/games/${d.game.slug}`}
                  className="font-semibold hover:underline"
                >
                  {d.game.name}
                </Link>
                <div className="text-xs text-(--muted-foreground)">
                  Draw #{d.drawNumber} · {fmtDate(d.scheduledAt)}
                </div>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-(--muted-foreground) border border-(--border) rounded px-1.5 py-0.5">
                {d.status}
              </span>
            </div>
            <DrawResultDisplay kind={d.game.kind} result={parsed} compact />
          </div>
        );
      })}
    </div>
  );
}
