import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

const AddressSchema = z.object({
  label: z.string().min(1).max(20),
  roadAddress: z.string().min(1).max(200),
  detail: z.string().max(100).optional(),
  lat: z.number().default(37.5012),
  lng: z.number().default(127.0396),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const addresses = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  });
  return NextResponse.json(addresses);
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = AddressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  if (parsed.data.isDefault) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const count = await prisma.address.count({ where: { userId } });

  const created = await prisma.address.create({
    data: {
      userId,
      label: parsed.data.label,
      roadAddress: parsed.data.roadAddress,
      detail: parsed.data.detail,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      isDefault: parsed.data.isDefault ?? count === 0,
    },
  });
  return NextResponse.json(created);
}
