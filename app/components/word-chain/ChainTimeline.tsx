"use client";

import { useEffect, useRef } from "react";
import type { ChainEntry } from "@/lib/learning/types";
import { Sparkles } from "lucide-react";

interface Props {
  chain: ChainEntry[];
  lastChar: string | null;
}

export function ChainTimeline({ chain, lastChar }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ left: ref.current.scrollWidth, behavior: "smooth" });
  }, [chain.length]);

  return (
    <div
      ref={ref}
      className="flex gap-2 overflow-x-auto py-2 -mx-4 px-4 scrollbar-thin"
    >
      {chain.length === 0 && (
        <div className="text-sm text-[var(--muted-foreground)] italic self-center">
          첫 단어를 입력해보세요
        </div>
      )}
      {chain.map((c, i) => {
        const isLast = i === chain.length - 1;
        return (
          <div
            key={`${c.word}-${i}`}
            className={`flex-shrink-0 px-3 h-9 rounded-full border inline-flex items-center gap-1.5 text-sm ${
              isLast
                ? "bg-[var(--brand)] text-[var(--brand-foreground)] border-[var(--brand)] font-semibold"
                : "bg-[var(--card)] border-[var(--border)]"
            }`}
          >
            <span>{c.word}</span>
            {c.validatedBy === "ai" && (
              <Sparkles className="w-3 h-3 opacity-70" />
            )}
            <span className="text-[10px] opacity-60">+{c.scoreDelta}</span>
          </div>
        );
      })}
      {lastChar && chain.length > 0 && (
        <div className="flex-shrink-0 self-center text-xs text-[var(--muted-foreground)] italic">
          → &lsquo;{lastChar}&rsquo;
        </div>
      )}
    </div>
  );
}
