import { prisma } from "@/lib/db";

// MVP: single demo user until NextAuth lands in Phase 2. The seed script
// creates demo@commute.local — every read/write uses this user id.
const DEMO_EMAIL = "demo@commute.local";

export async function getCurrentUser() {
  let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: DEMO_EMAIL, name: "Demo User" },
    });
  }
  return user;
}
