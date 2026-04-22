import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ResultsList } from "@/components/results/ResultsList";

export const dynamic = "force-dynamic";

export default async function GameResultsPage({
  params,
}: {
  params: Promise<{ gameSlug: string }>;
}) {
  const { gameSlug } = await params;
  const game = await prisma.game.findUnique({
    where: { slug: gameSlug },
    select: { id: true, name: true, nameKo: true },
  });
  if (!game) notFound();

  const draws = await prisma.draw.findMany({
    where: { gameId: game.id, status: "SETTLED" },
    orderBy: { scheduledAt: "desc" },
    take: 30,
    include: {
      game: {
        select: { slug: true, name: true, nameKo: true, kind: true },
      },
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <Link
          href="/results"
          className="text-xs text-(--muted-foreground) hover:underline"
        >
          ← 전체 결과
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1">
          {game.name} 결과
        </h1>
        {game.nameKo && (
          <div className="text-(--muted-foreground) mt-1">{game.nameKo}</div>
        )}
      </div>
      <ResultsList draws={draws} />
    </div>
  );
}
