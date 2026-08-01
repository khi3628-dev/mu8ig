import { prisma } from "@/lib/db";
import { DealCard } from "@/components/deals/DealCard";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const now = new Date();
  const deals = await prisma.deal.findMany({
    where: { active: true, validTo: { gt: now } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">오늘의 짠테크</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          출퇴근 시간에 바로 행동할 수 있는 딜 모음. 카드를 누르면 이동 전 클릭이
          기록됩니다.
        </p>
      </header>

      {deals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          오늘 표시할 딜이 없어요. <code>npm run db:seed</code> 로 샘플을
          채워보세요.
        </p>
      ) : (
        <div className="space-y-3">
          {deals.map((d) => (
            <DealCard
              key={d.id}
              id={d.id}
              title={d.title}
              category={d.category}
              description={d.description}
              discountLabel={d.discountLabel}
              validTo={d.validTo.toISOString()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
