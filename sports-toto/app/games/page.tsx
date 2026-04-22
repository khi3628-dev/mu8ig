import { prisma } from "@/lib/db";
import { GameCard } from "@/components/game/GameCard";
import { findGameBySlug } from "@/lib/games/registry";

export const dynamic = "force-dynamic";

export default async function GamesListPage() {
  const games = await prisma.game.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    select: {
      slug: true,
      name: true,
      nameKo: true,
      kind: true,
      drawSchedule: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">전체 게임</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {games.map((g) => {
          const def = findGameBySlug(g.slug);
          return (
            <GameCard
              key={g.slug}
              game={{ ...g, tagline: def?.tagline }}
            />
          );
        })}
      </div>
    </div>
  );
}
