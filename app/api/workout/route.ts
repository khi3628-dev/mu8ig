import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildProgram, nextDayType, cyclesCompletedFor, isDayType } from "@/lib/workout/program";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CreateSchema = z.object({
  dayType: z.string().refine(isDayType, "유효하지 않은 dayType입니다."),
  note: z.string().optional(),
});

// 미니 캘린더 표시용. 날짜별 그룹핑은 클라이언트 로컬 타임존 기준으로 하므로
// 여기서는 넉넉하게(최근 60일) 원본만 내려준다.
const CALENDAR_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

export async function GET() {
  const completedCount = await prisma.workoutSession.count();
  const cyclesCompleted = cyclesCompletedFor(completedCount);
  const next = buildProgram(cyclesCompleted)[nextDayType(completedCount)];
  const history = await prisma.workoutSession.findMany({
    orderBy: { completedAt: "desc" },
    take: 10,
  });
  const calendar = await prisma.workoutSession.findMany({
    where: { completedAt: { gte: new Date(Date.now() - CALENDAR_WINDOW_MS) } },
    orderBy: { completedAt: "asc" },
    select: { dayType: true, completedAt: true },
  });

  return NextResponse.json({
    next,
    completedCount,
    cyclesCompleted,
    history,
    calendar,
  });
}

export async function POST(request: NextRequest) {
  const parsed = CreateSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const session = await prisma.workoutSession.create({
    data: { dayType: parsed.data.dayType, note: parsed.data.note },
  });

  const completedCount = await prisma.workoutSession.count();
  const cyclesCompleted = cyclesCompletedFor(completedCount);
  const next = buildProgram(cyclesCompleted)[nextDayType(completedCount)];

  return NextResponse.json(
    { session, next, completedCount, cyclesCompleted },
    { status: 201 }
  );
}
