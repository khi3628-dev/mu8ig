"use client";

import { WordChainBoard } from "@/app/components/word-chain/WordChainBoard";
import { useT } from "@/app/components/shared/T";

export default function WordChainPage() {
  const t = useT();
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">{t("wc.title")}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("wc.subtitle")}
        </p>
      </header>
      <WordChainBoard />
    </div>
  );
}
