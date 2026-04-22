import Link from "next/link";
import { SlipBadge } from "@/components/betslip/SlipBadge";

const NAV = [
  { href: "/games", label: "게임" },
  { href: "/results", label: "결과" },
  { href: "/results/check", label: "번호 확인" },
  { href: "/how-to-play", label: "이용 방법" },
  { href: "/responsible-gaming", label: "책임 게이밍" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-(--background)/85 backdrop-blur border-b border-(--border)">
      <div className="mx-auto max-w-6xl flex items-center gap-4 px-4 h-14">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="inline-block w-7 h-7 rounded-md bg-(--brand) text-(--brand-foreground) grid place-items-center text-sm">
            DT
          </span>
          <span className="hidden sm:inline">Demo Toto MY</span>
        </Link>
        <nav className="flex-1 flex items-center gap-1 sm:gap-4 overflow-x-auto text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="px-2 py-1.5 rounded hover:bg-(--muted) whitespace-nowrap"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <SlipBadge />
        <Link
          href="/auth/signin"
          className="hidden sm:inline-flex items-center rounded-md border border-(--border) px-3 py-1.5 text-sm hover:bg-(--muted)"
        >
          로그인
        </Link>
      </div>
    </header>
  );
}
