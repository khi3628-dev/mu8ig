"use client";

import { CategoryGrid } from "@/app/components/flashcards/CategoryGrid";
import { useT } from "@/app/components/shared/T";

export default function FlashcardsHome() {
  const t = useT();
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">{t("fc.title")}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("fc.subtitle")}
        </p>
      </header>
      <CategoryGrid />
    </div>
  );
}
