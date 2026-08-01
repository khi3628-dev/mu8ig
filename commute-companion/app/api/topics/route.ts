import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const topics = await prisma.topic.findMany({ orderBy: { slug: "asc" } });
  return NextResponse.json({ topics });
}
