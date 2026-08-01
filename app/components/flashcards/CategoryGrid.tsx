"use client";

import Link from "next/link";
import { MessageCircle, GitBranch, HelpCircle } from "lucide-react";
import { useProgressStore } from "@/app/state/progressStore";
import { useHasMounted } from "@/app/state/useHasMounted";
import { countDue } from "@/lib/learning/flashcards/selectDeck";
import expressionsData from "@/lib/data/expressions.json";
import type { Expression } from "@/lib/learning/types";
import { useT } from "@/app/components/shared/T";

const all = expressionsData as Expression[];

const categories: {
  key: Expression["category"];
  Icon: typeof MessageCircle;
  labelKey: "fc.category.opening" | "fc.category.transition" | "fc.category.qa";
}[] = [
  { key: "opening", Icon: MessageCircle, labelKey: "fc.category.opening" },
  { key: "transition", Icon: GitBranch, labelKey: "fc.category.transition" },
  { key: "qa", Icon: HelpCircle, labelKey: "fc.category.qa" },
];

export function CategoryGrid() {
  const t = useT();
  const mounted = useHasMounted();
  const srsState = useProgressStore((s) => s.flashcardSRS);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {categories.map(({ key, Icon, labelKey }) => {
        const due = mounted ? countDue(all, srsState, key) : all.filter((e) => e.category === key).length;
        const total = all.filter((e) => e.category === key).length;
        return (
          <Link
            key={key}
            href={`/flashcards/${key}`}
            className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4 hover:border-[var(--brand)] transition"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-muted)] text-[var(--brand)] flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
            <div className="mt-3 font-semibold">{t(labelKey)}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">
              {t("fc.dueSoon", { n: due })} · {total}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
