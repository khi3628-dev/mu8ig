import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { SignOutButton } from "./SignOutButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      dateOfBirth: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/auth/signin");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">설정</h1>

      <section className="rounded-lg border border-(--border) p-4 space-y-3">
        <h2 className="font-semibold">계정 정보</h2>
        <dl className="grid grid-cols-[80px_1fr] gap-2 text-sm">
          <dt className="text-(--muted-foreground)">이메일</dt>
          <dd>{user.email}</dd>
          <dt className="text-(--muted-foreground)">이름</dt>
          <dd>{user.name ?? "—"}</dd>
          <dt className="text-(--muted-foreground)">생년월일</dt>
          <dd>
            {user.dateOfBirth
              ? new Date(user.dateOfBirth).toLocaleDateString("ko-KR")
              : "—"}
          </dd>
          <dt className="text-(--muted-foreground)">역할</dt>
          <dd>{user.role}</dd>
          <dt className="text-(--muted-foreground)">가입일</dt>
          <dd>{user.createdAt.toLocaleDateString("ko-KR")}</dd>
        </dl>
      </section>

      <SignOutButton />
    </div>
  );
}
