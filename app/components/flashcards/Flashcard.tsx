"use client";

import { useState } from "react";
import { Repeat } from "lucide-react";
import type { Expression } from "@/lib/learning/types";
import { cn } from "@/lib/learning/cn";

interface Props {
  expression: Expression;
}

export function Flashcard({ expression }: Props) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      className="w-full h-64 sm:h-72 relative [perspective:1200px]"
      aria-label="Flip card"
    >
      <div
        className={cn(
          "absolute inset-0 rounded-3xl transition-transform duration-500 [transform-style:preserve-3d]",
          flipped && "[transform:rotateY(180deg)]",
        )}
      >
        <div className="absolute inset-0 rounded-3xl bg-[var(--card)] border border-[var(--border)] p-6 flex flex-col justify-between [backface-visibility:hidden]">
          <div className="text-xs uppercase text-[var(--brand)] font-semibold">
            {expression.category}
          </div>
          <div className="text-xl font-semibold leading-snug text-center">
            {expression.en}
          </div>
          <div className="flex items-center justify-center text-xs text-[var(--muted-foreground)] gap-1">
            <Repeat className="w-3 h-3" />
            Tap to flip
          </div>
        </div>
        <div className="absolute inset-0 rounded-3xl bg-[var(--brand-muted)] border border-[var(--brand)]/30 p-6 flex flex-col justify-between [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="text-xs uppercase text-[var(--brand)] font-semibold">
            뜻 / 예문
          </div>
          <div className="space-y-3 text-center">
            <div className="text-lg font-semibold">{expression.ko}</div>
            <div className="text-sm text-[var(--muted-foreground)] italic">
              &ldquo;{expression.exampleEn}&rdquo;
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              {expression.exampleKo}
            </div>
          </div>
          <div className="flex items-center justify-center text-xs text-[var(--muted-foreground)] gap-1">
            <Repeat className="w-3 h-3" />
            Tap to flip
          </div>
        </div>
      </div>
    </button>
  );
}
