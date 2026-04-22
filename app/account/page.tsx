import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { senToMyr } from "@/lib/currency";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccountDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [user, betCount, recentBets] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        name: true,
        walletBalanceSen: true,
        kycStatus: true,
        createdAt: true,
      },
    }),
    prisma.bet.count({ where: { userId: session.user.id } }),
    prisma.bet.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        game: { select: { name: true, slug: true } },
        draw: { select: { drawNumber: true } },
      },
    }),
  ]);

  if (!user) redirect("/auth/signin");

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">
          안녕하세요{user.name ? `, ${user.name}` : ""} 👋
        </h1>
        <p className="text-sm text-(--muted-foreground)">{user.email}</p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-(--border) p-4">
          <div className="text-xs text-(--muted-foreground) mb-1">지갑 잔액</div>
          <div className="text-2xl font-bold">
            {senToMyr(user.walletBalanceSen)}
          </div>
          <Link
            href="/account/wallet"
            className="text-xs text-(--brand) underline underline-offset-2"
          >
            지갑 관리 →
          </Link>
        </div>
        <div className="rounded-lg border border-(--border) p-4">
          <div className="text-xs text-(--muted-foreground) mb-1">누적 베팅</div>
          <div className="text-2xl font-bold">{betCount}건</div>
          <Link
            href="/account/bets"
            className="text-xs text-(--brand) underline underline-offset-2"
          >
            내역 보기 →
          </Link>
        </div>
        <div className="rounded-lg border border-(--border) p-4">
          <div className="text-xs text-(--muted-foreground) mb-1">KYC 상태</div>
          <div className="text-2xl font-bold">{user.kycStatus}</div>
          <div className="text-[11px] text-(--muted-foreground)">
            출금은 VERIFIED 상태에서 가능 (Phase 5+)
          </div>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">최근 베팅</h2>
        {recentBets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-(--border) p-6 text-sm text-center text-(--muted-foreground)">
            아직 베팅이 없습니다.{" "}
            <Link href="/games" className="underline">
              게임 둘러보기 →
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {recentBets.map((b) => (
              <li
                key={b.id}
                className="rounded-lg border border-(--border) p-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{b.game.name}</div>
                  <div className="text-xs text-(--muted-foreground)">
                    Draw #{b.draw.drawNumber} · {b.betType}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {senToMyr(b.totalCostSen)}
                  </div>
                  <div className="text-xs text-(--muted-foreground)">
                    {b.status}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
