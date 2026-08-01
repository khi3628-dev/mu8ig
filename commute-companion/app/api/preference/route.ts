import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const BodySchema = z.object({
  topics: z.array(z.string().min(1)).min(1).max(6),
  region: z.string().min(1).max(20),
  commuteStart: z.string().regex(TIME),
  commuteEnd: z.string().regex(TIME),
  audioEnabled: z.boolean().default(true),
});

export async function GET() {
  const user = await getCurrentUser();
  const pref = await prisma.preference.findUnique({ where: { userId: user.id } });
  if (!pref) return NextResponse.json({ preference: null });
  return NextResponse.json({
    preference: {
      topics: JSON.parse(pref.topics),
      region: pref.region,
      commuteStart: pref.commuteStart,
      commuteEnd: pref.commuteEnd,
      audioEnabled: pref.audioEnabled,
    },
  });
}

export async function POST(request: NextRequest) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const user = await getCurrentUser();
  const data = {
    topics: JSON.stringify(parsed.data.topics),
    region: parsed.data.region,
    commuteStart: parsed.data.commuteStart,
    commuteEnd: parsed.data.commuteEnd,
    audioEnabled: parsed.data.audioEnabled,
  };
  const pref = await prisma.preference.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  });
  return NextResponse.json({ ok: true, preferenceId: pref.id });
}
