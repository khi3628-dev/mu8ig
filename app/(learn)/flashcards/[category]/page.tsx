"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FlashcardDeck } from "@/app/components/flashcards/FlashcardDeck";
import { useT } from "@/app/components/shared/T";
import type { Expression } from "@/lib/learning/types";

const validCategories = new Set<Expression["category"]>([
  "opening",
  "transition",
  "qa",
]);

export default function FlashcardCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const t = useT();
  const { category } = use(params);
  const cat = validCategories.has(category as Expression["category"])
    ? (category as Expression["category"])
    : undefined;

  const labelMap: Record<Expression["category"], "fc.category.opening" | "fc.category.transition" | "fc.category.qa"> = {
    opening: "fc.category.opening",
    transition: "fc.category.transition",
    qa: "fc.category.qa",
  };

  return (
    <div className="space-y-4">
      <Link
        href="/flashcards"
        className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("common.back")}
      </Link>
      <header>
        <h1 className="text-xl font-bold">
          {cat ? t(labelMap[cat]) : t("fc.title")}
        </h1>
      </header>
      <FlashcardDeck category={cat} />
    </div>
  );
}
