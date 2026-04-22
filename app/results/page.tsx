import Link from "next/link";
import { prisma } from "@/lib/db";
import { ResultsList } from "@/components/results/ResultsList";

export const dynamic = "force-dynamic";

export default async function ResultsIndexPage() {
  const draws = await prisma.draw.findMany({
    where: { status: "SETTLED" },
    orderBy: { scheduledAt: "desc" },
    take: 20,
    include: {
      game: {
        select: { slug: true, name: true, nameKo: true, kind: true },
      },
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold">최신 결과</h1>
        <Link
          href="/results/check"
          className="text-sm underline underline-offset-4"
        >
          내 번호 확인하기 →
        </Link>
      </div>
      <ResultsList draws={draws} />
    </div>
  );
}
