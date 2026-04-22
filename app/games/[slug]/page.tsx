import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { findGameBySlug } from "@/lib/games/registry";
import { GamePrizeTable } from "@/components/game/GamePrizeTable";
import { DrawCountdown } from "@/components/game/DrawCountdown";
import { DrawResultDisplay } from "@/components/results/DrawResultDisplay";
import { senToMyr } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const def = findGameBySlug(slug);

  const game = await prisma.game.findUnique({
    where: { slug },
    include: {
      prizeTiers: { orderBy: { rank: "asc" } },
      draws: {
        orderBy: { scheduledAt: "desc" },
        take: 6,
      },
    },
  });

  if (!game) notFound();

  const upcoming = game.draws.find((d) => d.status === "OPEN");
  const latestSettled = game.draws.find((d) => d.status === "SETTLED");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <section>
        <div className="text-xs text-(--muted-foreground) mb-1">
          {game.kind.replace(/_/g, " ")}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">{game.name}</h1>
        {game.nameKo && (
          <div className="text-(--muted-foreground) mt-1">{game.nameKo}</div>
        )}
        {def?.tagline && <p className="mt-3">{def.tagline}</p>}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-(--muted-foreground)">드로우 일정:</span>{" "}
            {game.drawSchedule}
          </div>
          <div>
            <span className="text-(--muted-foreground)">최소 베팅:</span>{" "}
            {senToMyr(game.minStakeSen)}
          </div>
          {game.pickCount != null && game.poolSize != null && (
            <div>
              <span className="text-(--muted-foreground)">선택:</span>{" "}
              1 ~ {game.poolSize} 중 {game.pickCount}개
            </div>
          )}
          {game.digitCount != null && (
            <div>
              <span className="text-(--muted-foreground)">자리수:</span>{" "}
              {game.digitCount}자리
            </div>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/play/${game.slug}`}
            className="inline-flex items-center rounded-md bg-(--brand) text-(--brand-foreground) px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            번호 선택하기
          </Link>
          <Link
            href={`/results/${game.slug}`}
            className="inline-flex items-center rounded-md border border-(--border) px-4 py-2 text-sm font-medium hover:bg-(--muted)"
          >
            전체 결과 보기
          </Link>
        </div>
      </section>

      {upcoming && (
        <section className="rounded-lg border border-(--border) p-4 bg-(--muted)/40">
          <div className="text-xs text-(--muted-foreground) mb-1">
            다음 드로우
          </div>
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div>
              <div className="font-semibold">Draw #{upcoming.drawNumber}</div>
              <div className="text-sm text-(--muted-foreground)">
                {new Date(upcoming.scheduledAt).toLocaleString("ko-KR")}
              </div>
            </div>
            <DrawCountdown targetISO={upcoming.closesAt.toISOString()} />
          </div>
        </section>
      )}

      {latestSettled && latestSettled.results && (
        <section>
          <h2 className="text-lg font-semibold mb-3">최근 당첨 결과</h2>
          <div className="rounded-lg border border-(--border) p-4 space-y-3">
            <div className="text-xs text-(--muted-foreground)">
              Draw #{latestSettled.drawNumber} ·{" "}
              {new Date(latestSettled.scheduledAt).toLocaleDateString("ko-KR")}
            </div>
            <DrawResultDisplay
              kind={game.kind}
              result={JSON.parse(latestSettled.results)}
            />
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">상금 구조</h2>
        <GamePrizeTable tiers={game.prizeTiers} />
        <p className="text-[11px] text-(--muted-foreground) mt-2">
          * 표시된 상금은 시뮬레이션용 예시값이며 실제 상금과 다릅니다.
        </p>
      </section>
    </div>
  );
}
