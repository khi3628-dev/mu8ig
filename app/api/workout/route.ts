import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PROGRAM, nextDayType, isDayType } from "@/lib/workout/program";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CreateSchema = z.object({
  dayType: z.string().refine(isDayType, "유효하지 않은 dayType입니다."),
  note: z.string().optional(),
});

export async function GET() {
  const completedCount = await prisma.workoutSession.count();
  const next = PROGRAM[nextDayType(completedCount)];
  const history = await prisma.workoutSession.findMany({
    orderBy: { completedAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ next, completedCount, history });
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
  const next = PROGRAM[nextDayType(completedCount)];

  return NextResponse.json({ session, next, completedCount }, { status: 201 });
}
