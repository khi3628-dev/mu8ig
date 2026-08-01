"use client";

import { useLocaleStore } from "@/app/state/localeStore";
import { useHasMounted } from "@/app/state/useHasMounted";
import { cn } from "@/lib/learning/cn";
import { Languages } from "lucide-react";

export function LocaleToggle({ className }: { className?: string }) {
  const mounted = useHasMounted();
  const { locale, toggle } = useLocaleStore();
  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-[var(--border)] bg-[var(--card)] text-xs font-medium hover:bg-[var(--muted)] transition",
        className,
      )}
      aria-label="Toggle language"
    >
      <Languages className="w-3.5 h-3.5" />
      {mounted ? (locale === "ko" ? "한국어 · EN" : "EN · 한국어") : "…"}
    </button>
  );
}
