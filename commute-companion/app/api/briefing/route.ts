import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { startOfDayKst } from "@/lib/briefing/generate";

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
    return NextResponse.json({ briefing: null });
  }

  return NextResponse.json({
    briefing: {
      id: briefing.id,
      date: briefing.date.toISOString(),
      slot: briefing.slot,
      sections: JSON.parse(briefing.sections),
      audioUrl: briefing.audioUrl,
    },
  });
}
