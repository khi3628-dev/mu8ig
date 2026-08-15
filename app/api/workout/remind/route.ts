import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PROGRAM, nextDayType } from "@/lib/workout/program";
import { sendTelegram, formatWorkoutReminderMessage } from "@/lib/notify/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 크론 진입점. GitHub Actions 워크플로가 x-cron-secret 헤더를 달고 호출한다.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const completedCount = await prisma.workoutSession.count();
  const next = PROGRAM[nextDayType(completedCount)];

  const result = await sendTelegram(formatWorkoutReminderMessage(next));

  return NextResponse.json({
    remindedAt: new Date().toISOString(),
    dayType: next.dayType,
    sent: result,
  });
}
