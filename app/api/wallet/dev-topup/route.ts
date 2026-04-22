import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mutateWallet } from "@/lib/wallet";

// DEV-ONLY: Credits the current user's wallet. Phase 5 replaces this with
// a Stripe deposit + webhook flow. Disabled in production.

const schema = z.object({
  amountSen: z.number().int().positive().max(100_000_00), // cap RM 100,000
});

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const raw = await req.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    return mutateWallet(tx, {
      userId: session.user.id,
      type: "DEPOSIT",
      amountSen: parsed.data.amountSen,
      referenceType: "dev_topup",
    });
  });

  return NextResponse.json({ ok: true, balanceSen: result.balanceAfterSen });
}
