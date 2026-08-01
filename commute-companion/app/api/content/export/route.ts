import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { startOfDayKst } from "@/lib/briefing/generate";
import { generateYoutubePackage } from "@/lib/content/youtube";
import type { Section } from "@/lib/ai/summarize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const slot = (request.nextUrl.searchParams.get("slot") ?? "AM") as "AM" | "PM";
  const user = await getCurrentUser();
  const date = startOfDayKst();

  const briefing = await prisma.briefing.findUnique({
    where: { userId_date_slot: { userId: user.id, date, slot } },
  });
  if (!briefing) {
    return NextResponse.json(
      {
        error:
          "오늘의 브리핑이 아직 없습니다. 먼저 POST /api/briefing/generate 로 생성하세요.",
      },
      { status: 404 }
    );
  }

  const sections = JSON.parse(briefing.sections) as Section[];
  const pkg = await generateYoutubePackage(sections);
  return NextResponse.json({
    date: briefing.date.toISOString(),
    slot,
    package: pkg,
  });
}
