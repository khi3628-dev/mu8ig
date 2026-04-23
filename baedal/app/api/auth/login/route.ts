import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { setSession } from "@/lib/session";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.hashedPassword))) {
    return NextResponse.json(
      { error: "INVALID_CREDENTIALS", message: "이메일 또는 비밀번호가 올바르지 않아요." },
      { status: 401 },
    );
  }

  await setSession(user.id);
  return NextResponse.json({ id: user.id, email: user.email, name: user.name });
}
