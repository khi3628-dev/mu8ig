import { NextRequest, NextResponse } from "next/server";
import { checkAllWatches } from "@/lib/watch/check";

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

  const results = await checkAllWatches();

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    watches: results.length,
    notified: results.reduce((sum, r) => sum + r.notified, 0),
    failed: results.filter((r) => r.errors.length > 0),
    results,
  });
}
