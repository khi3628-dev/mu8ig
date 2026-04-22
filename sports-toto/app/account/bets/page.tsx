import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { senToMyr } from "@/lib/currency";
import { redirect } from "next/navigation";
import type {
  FourDSelection,
  FourDJackpotSelection,
  FiveDSelection,
  SixDSelection,
  PickNofMSelection,
} from "@/lib/games/types";

export const dynamic = "force-dynamic";

function formatSelection(gameKind: string, selJson: string): string {
  try {
    const s = JSON.parse(selJson) as unknown;
    switch (gameKind) {
      case "FOUR_D":
      case "FIVE_D":
      case "SIX_D":
        return (s as FourDSelection | FiveDSelection | SixDSelection).digits;
      case "FOUR_D_JACKPOT": {
        const j = s as FourDJackpotSelection;
        return `${j.digitsA} + ${j.digitsB}`;
      }
      case "PICK_N_OF_M":
        return (s as PickNofMSelection).numbers.join(" · ");
    }
    return selJson;
  } catch {
    return selJson;
  }
}

function statusChip(status: string): string {
  switch (status) {
    case "PLACED":
      return "border border-(--border) text-(--muted-foreground)";
    case "WON":
      return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200";
    case "LOST":
      return "bg-(--muted) text-(--muted-foreground)";
    case "VOID":
      return "bg-amber-100 text-amber-800";
  }
  return "border border-(--border)";
}

export default async function MyBetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const bets = await prisma.bet.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      game: { select: { slug: true, name: true, kind: true } },
      draw: {
        select: {
          drawNumber: true,
          scheduledAt: true,
          status: true,
        },
      },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">내 베팅 내역</h1>
      {bets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-(--border) p-8 text-sm text-center text-(--muted-foreground)">
          아직 베팅 기록이 없습니다.
        </div>
      ) : (
        <ul className="space-y-3">
          {bets.map((b) => (
            <li
              key={b.id}
              className="rounded-lg border border-(--border) p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold">{b.game.name}</div>
                  <div className="text-xs text-(--muted-foreground)">
                    Draw #{b.draw.drawNumber} ·{" "}
                    {new Date(b.draw.scheduledAt).toLocaleDateString("ko-KR")} ·{" "}
                    {b.betType}
                  </div>
                </div>
                <span
                  className={
                    "text-[11px] uppercase tracking-wider rounded px-2 py-0.5 " +
                    statusChip(b.status)
                  }
                >
                  {b.status}
                </span>
              </div>
              <div className="font-mono text-sm break-all">
                {formatSelection(b.game.kind, b.selection)}
              </div>
              <div className="flex items-center justify-between text-xs text-(--muted-foreground)">
                <span>
                  {senToMyr(b.stakeSen)} × {b.multiplier} ={" "}
                  <strong className="text-(--foreground)">
                    {senToMyr(b.totalCostSen)}
                  </strong>
                </span>
                {b.status === "WON" && (
                  <span className="text-green-700 dark:text-green-400 font-semibold">
                    +{senToMyr(b.payoutSen)}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
