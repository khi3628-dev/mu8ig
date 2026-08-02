import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateBriefingsDueNow, type Slot } from "@/lib/briefing/generate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  slot: z.enum(["AM", "PM"]).default("AM"),
});

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const results = await generateBriefingsDueNow(parsed.data.slot as Slot);
  return NextResponse.json({
    slot: parsed.data.slot,
    generatedAt: new Date().toISOString(),
    total: results.length,
    ok: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok),
  });
}
