import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkWatch } from "@/lib/watch/check";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CreateSchema = z.object({
  complexNo: z.string().min(1),
  complexName: z.string().min(1),
  tradeType: z.enum(["A1", "B1", "B2"]),
  areaMinM2: z.number().positive().nullable().optional(),
  areaMaxM2: z.number().positive().nullable().optional(),
  maxPriceManwon: z.number().int().positive().nullable().optional(),
});

export async function GET() {
  const watches = await prisma.watch.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { seen: true } } },
  });

  return NextResponse.json({ total: watches.length, watches });
}

export async function POST(request: NextRequest) {
  const parsed = CreateSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const input = parsed.data;

  if (
    input.areaMinM2 != null &&
    input.areaMaxM2 != null &&
    input.areaMinM2 > input.areaMaxM2
  ) {
    return NextResponse.json(
      { error: "전용면적 하한이 상한보다 큽니다." },
      { status: 400 }
    );
  }

  const existing = await prisma.watch.findUnique({
    where: {
      complexNo_tradeType: {
        complexNo: input.complexNo,
        tradeType: input.tradeType,
      },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 등록된 단지/거래유형입니다." },
      { status: 409 }
    );
  }

  const watch = await prisma.watch.create({
    data: {
      complexNo: input.complexNo,
      complexName: input.complexName,
      tradeType: input.tradeType,
      areaMinM2: input.areaMinM2 ?? null,
      areaMaxM2: input.areaMaxM2 ?? null,
      maxPriceManwon: input.maxPriceManwon ?? null,
    },
  });

  // 등록 시점의 매물은 알림 없이 "본 것"으로 기록한다.
  // 실패해도 등록 자체는 유지하고, 다음 주기에 재시도된다.
  let seeded = 0;
  let seedError: string | null = null;
  try {
    const result = await checkWatch(watch, { seedOnly: true });
    seeded = result.fresh;
  } catch (error) {
    seedError = String(error);
  }

  return NextResponse.json({ watch, seeded, seedError }, { status: 201 });
}
