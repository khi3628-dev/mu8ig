import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { findGameBySlug } from "@/lib/games/registry";
import { PlayExperience } from "./PlayExperience";
import { DrawCountdown } from "@/components/game/DrawCountdown";

export const dynamic = "force-dynamic";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ gameSlug: string }>;
}) {
  const { gameSlug } = await params;
  const def = findGameBySlug(gameSlug);

  const game = await prisma.game.findUnique({
    where: { slug: gameSlug },
    include: {
      draws: {
        where: { status: "OPEN" },
        orderBy: { scheduledAt: "asc" },
        take: 1,
      },
    },
  });
  if (!game) notFound();

  const openDraw = game.draws[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div>
        <Link
          href={`/games/${game.slug}`}
          className="text-xs text-(--muted-foreground) hover:underline"
        >
          ← {game.name} 상세
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1">
          {game.name} 번호 선택
        </h1>
        {def?.tagline && (
          <p className="text-sm text-(--muted-foreground) mt-1">{def.tagline}</p>
        )}
        {openDraw && (
          <div className="mt-3 text-sm">
            <span className="text-(--muted-foreground)">
              다음 드로우 #{openDraw.drawNumber} · {" "}
            </span>
            <DrawCountdown targetISO={openDraw.closesAt.toISOString()} />
          </div>
        )}
      </div>

      <PlayExperience
        game={{
          id: game.id,
          slug: game.slug,
          name: game.name,
          kind: game.kind,
          pickCount: game.pickCount,
          poolSize: game.poolSize,
          digitCount: game.digitCount,
          minStakeSen: game.minStakeSen,
        }}
      />
    </div>
  );
}
