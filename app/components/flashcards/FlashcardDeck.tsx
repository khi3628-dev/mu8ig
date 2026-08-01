"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { useProgressStore } from "@/app/state/progressStore";
import { useHasMounted } from "@/app/state/useHasMounted";
import { selectDeck } from "@/lib/learning/flashcards/selectDeck";
import { bump, demote, initialEntry } from "@/lib/learning/flashcards/srs";
import expressionsData from "@/lib/data/expressions.json";
import type { Expression } from "@/lib/learning/types";
import { Flashcard } from "./Flashcard";
import { Button } from "@/app/components/shared/Button";
import { useT } from "@/app/components/shared/T";

const allExpressions = expressionsData as Expression[];

interface Props {
  category?: Expression["category"];
}

export function FlashcardDeck({ category }: Props) {
  const t = useT();
  const mounted = useHasMounted();
  const srsState = useProgressStore((s) => s.flashcardSRS);
  const { upsertSRS, recordDaily } = useProgressStore();

  const deck = useMemo(
    () => (mounted ? selectDeck(allExpressions, srsState, { category }) : []),
    [mounted, srsState, category],
  );

  const [idx, setIdx] = useState(0);
  const [key, setKey] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIdx(0);
    setReviewedCount(0);
  }, [category]);

  if (!mounted) {
    return (
      <div className="h-64 rounded-3xl bg-[var(--muted)] animate-pulse" />
    );
  }
  if (!deck.length) {
    return (
      <div className="rounded-2xl border border-[var(--border)] p-8 text-center text-[var(--muted-foreground)]">
        {t("common.empty")}
      </div>
    );
  }

  const current = deck[idx % deck.length];

  const handle = (known: boolean) => {
    const entry =
      srsState[current.id] ?? initialEntry(Date.now());
    const next = known ? bump(entry) : demote(entry);
    upsertSRS(current.id, next);
    setReviewedCount((n) => n + 1);
    setIdx((i) => i + 1);
    setKey((k) => k + 1);
    recordDaily({ flashcardsReviewed: reviewedCount + 1 });
  };

  return (
    <div className="space-y-4">
      <Flashcard key={key} expression={current} />
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => handle(false)} size="lg">
          <X className="w-4 h-4" />
          {t("fc.unknown")}
        </Button>
        <Button onClick={() => handle(true)} size="lg">
          <Check className="w-4 h-4" />
          {t("fc.known")}
        </Button>
      </div>
      <div className="text-xs text-center text-[var(--muted-foreground)]">
        {t("fc.progress", { done: (idx % deck.length) + 1, total: deck.length })}
      </div>
    </div>
  );
}
