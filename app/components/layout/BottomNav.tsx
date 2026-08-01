"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Zap,
  Layers,
  Mic,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/learning/cn";
import { useT } from "@/app/components/shared/T";

export function BottomNav() {
  const pathname = usePathname();
  const t = useT();
  const items = [
    { href: "/", label: t("nav.home"), Icon: Home },
    { href: "/word-chain", label: t("nav.wordChain"), Icon: Zap },
    { href: "/flashcards", label: t("nav.flashcards"), Icon: Layers },
    { href: "/voice-style", label: t("nav.voiceStyle"), Icon: Mic },
    { href: "/stats", label: t("nav.stats"), Icon: BarChart3 },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--background)]/95 backdrop-blur pb-safe">
      <ul className="max-w-3xl mx-auto grid grid-cols-5">
        {items.map(({ href, label, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium",
                  active
                    ? "text-[var(--brand)]"
                    : "text-[var(--muted-foreground)]",
                )}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
