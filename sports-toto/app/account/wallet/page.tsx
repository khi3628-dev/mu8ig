import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { senToMyr } from "@/lib/currency";
import { redirect } from "next/navigation";
import { DevTopUp } from "./DevTopUp";

export const dynamic = "force-dynamic";

const TX_LABELS: Record<string, string> = {
  DEPOSIT: "입금",
  WITHDRAWAL: "출금",
  BET_DEBIT: "베팅",
  BET_CREDIT_WIN: "당첨",
  REFUND: "환불",
  ADJUSTMENT: "조정",
};

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [user, txs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { walletBalanceSen: true },
    }),
    prisma.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-(--border) p-5">
        <div className="text-xs text-(--muted-foreground) mb-1">현재 잔액</div>
        <div className="text-3xl font-bold">
          {senToMyr(user?.walletBalanceSen ?? 0)}
        </div>
        <p className="text-[11px] text-(--muted-foreground) mt-2">
          Stripe 테스트 모드 입금은 Phase 5 에서 활성화됩니다. 지금은 dev 충전으로 테스트.
        </p>
      </section>

      <DevTopUp />

      <section className="space-y-2">
        <h2 className="font-semibold">거래 내역</h2>
        {txs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-(--border) p-6 text-sm text-center text-(--muted-foreground)">
            아직 거래 내역이 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-(--border) rounded-lg border border-(--border)">
            {txs.map((t) => (
              <li
                key={t.id}
                className="px-4 py-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-medium">{TX_LABELS[t.type] ?? t.type}</div>
                  <div className="text-xs text-(--muted-foreground)">
                    {new Date(t.createdAt).toLocaleString("ko-KR")}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={
                      t.amountSen >= 0
                        ? "text-green-700 dark:text-green-400 font-semibold"
                        : "text-red-600 dark:text-red-400 font-semibold"
                    }
                  >
                    {t.amountSen >= 0 ? "+" : ""}
                    {senToMyr(t.amountSen)}
                  </div>
                  <div className="text-xs text-(--muted-foreground)">
                    잔액 {senToMyr(t.balanceAfterSen)}
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
