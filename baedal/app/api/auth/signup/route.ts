import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { setSession } from "@/lib/session";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(72),
  name: z.string().min(1).max(40),
  phone: z.string().min(9).max(20).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return NextResponse.json(
      { error: "EMAIL_TAKEN", message: "이미 가입된 이메일이에요." },
      { status: 409 },
    );
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      hashedPassword: await hashPassword(parsed.data.password),
      name: parsed.data.name,
      phone: parsed.data.phone,
    },
  });

  await setSession(user.id);

  return NextResponse.json({ id: user.id, email: user.email, name: user.name });
}
