import { prisma } from "@/lib/db";
import { WinningNumberChecker } from "@/components/results/WinningNumberChecker";

export const dynamic = "force-dynamic";

export default async function CheckPage() {
  const games = await prisma.game.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    select: {
      slug: true,
      name: true,
      kind: true,
      digitCount: true,
      pickCount: true,
      poolSize: true,
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">번호 확인</h1>
        <p className="text-sm text-(--muted-foreground) mt-2">
          번호를 입력하면 해당 게임의 <strong>최신 확정 드로우</strong> 와
          비교해 어느 등급에 해당하는지 알려드립니다.
        </p>
      </div>
      <WinningNumberChecker games={games} />
    </div>
  );
}
