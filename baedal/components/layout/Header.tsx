import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { MapPin, ChevronDown } from "lucide-react";

export async function Header() {
  const user = await getSessionUser();
  let defaultAddress: { label: string; roadAddress: string } | null = null;
  if (user) {
    const a = await prisma.address.findFirst({
      where: { userId: user.id, isDefault: true },
    });
    if (a) defaultAddress = { label: a.label, roadAddress: a.roadAddress };
  }

  return (
    <header className="sticky top-0 z-30 bg-(--background)/90 backdrop-blur border-b border-(--border)">
      <div className="mx-auto max-w-5xl flex items-center gap-4 px-4 h-14">
        <Link href="/" className="flex items-center gap-2 font-bold text-(--brand)">
          <span className="inline-block w-8 h-8 rounded-lg bg-(--brand) text-(--brand-foreground) grid place-items-center text-sm">
            배
          </span>
          <span className="hidden sm:inline">배달</span>
        </Link>
        <Link
          href={user ? "/account/addresses" : "/login"}
          className="flex-1 flex items-center gap-1 text-sm min-w-0 hover:opacity-80"
        >
          <MapPin className="w-4 h-4 shrink-0 text-(--brand)" />
          <span className="truncate font-medium">
            {defaultAddress
              ? `${defaultAddress.label} · ${defaultAddress.roadAddress}`
              : "주소를 설정해 주세요"}
          </span>
          <ChevronDown className="w-4 h-4 shrink-0 text-(--muted-foreground)" />
        </Link>
        {user ? (
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="text-sm text-(--muted-foreground) hover:text-(--foreground)"
            >
              로그아웃
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium hover:text-(--brand)"
          >
            로그인
          </Link>
        )}
      </div>
    </header>
  );
}
