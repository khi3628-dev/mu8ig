"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingBag, Receipt, User } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/", label: "홈", icon: Home },
  { href: "/search", label: "검색", icon: Search },
  { href: "/cart", label: "장바구니", icon: ShoppingBag },
  { href: "/orders", label: "주문내역", icon: Receipt },
  { href: "/account", label: "내 정보", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 bg-(--background) border-t border-(--border)">
      <ul className="mx-auto max-w-5xl grid grid-cols-5">
        {TABS.map((t) => {
          const active =
            t.href === "/"
              ? pathname === "/"
              : pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-xs",
                  active
                    ? "text-(--brand)"
                    : "text-(--muted-foreground) hover:text-(--foreground)",
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
