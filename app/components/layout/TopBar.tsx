"use client";

import Link from "next/link";
import { StreakBadge } from "./StreakBadge";
import { LocaleToggle } from "./LocaleToggle";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 bg-[var(--background)]/85 backdrop-blur border-b border-[var(--border)]">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--brand)] text-[var(--brand-foreground)] font-bold text-sm">
            m8
          </span>
          <span className="font-bold tracking-tight">mu8ig</span>
        </Link>
        <div className="flex items-center gap-2">
          <StreakBadge />
          <LocaleToggle />
        </div>
      </div>
    </header>
  );
}
