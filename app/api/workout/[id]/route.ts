import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 잘못 눌렀을 때 되돌리기용. 로테이션 위치도 이 기록 개수로 계산되므로 취소하면 한 칸 되돌아간다. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.workoutSession.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.workoutSession.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
