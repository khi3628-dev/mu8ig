"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Check } from "lucide-react";
import type { DialogueScenario } from "@/lib/learning/types";
import { gradeOrder, type OrderResult } from "@/lib/learning/dialogues/grading";
import { Button } from "@/app/components/shared/Button";
import { useT } from "@/app/components/shared/T";
import { cn } from "@/lib/learning/cn";

interface Props {
  scenario: DialogueScenario;
  onComplete: (result: OrderResult) => void;
}

export function SentenceOrder({ scenario, onComplete }: Props) {
  const t = useT();
  const scrambled = scenario.scrambled ?? [];
  const correctOrder = scenario.correctOrder ?? [];
  const [order, setOrder] = useState<number[]>(() =>
    scrambled.map((_, i) => i),
  );
  const [result, setResult] = useState<OrderResult | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const next = order.slice();
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setOrder(next);
    setResult(null);
  };

  const check = () => {
    const r = gradeOrder(order, correctOrder);
    setResult(r);
    if (r.correct) onComplete(r);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[var(--muted)] p-4 text-sm">
        {scenario.contextKo}
      </div>

      <ol className="space-y-2">
        {order.map((sentenceIdx, position) => {
          const posOk =
            result && sentenceIdx === correctOrder[position];
          return (
            <li
              key={sentenceIdx}
              className={cn(
                "rounded-2xl border p-3 flex items-start gap-2",
                result
                  ? posOk
                    ? "border-[var(--success)] bg-[var(--success)]/10"
                    : "border-[var(--danger)] bg-[var(--danger)]/10"
                  : "border-[var(--border)] bg-[var(--card)]",
              )}
            >
              <div className="text-xs font-mono w-6 text-center text-[var(--muted-foreground)]">
                {position + 1}
              </div>
              <div className="flex-1 text-sm leading-relaxed">
                {scrambled[sentenceIdx]}
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => move(position, position - 1)}
                  disabled={position === 0}
                  className="w-7 h-7 rounded-full bg-[var(--muted)] disabled:opacity-30 flex items-center justify-center"
                  aria-label="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => move(position, position + 1)}
                  disabled={position === order.length - 1}
                  className="w-7 h-7 rounded-full bg-[var(--muted)] disabled:opacity-30 flex items-center justify-center"
                  aria-label="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <Button onClick={check} fullWidth>
        <Check className="w-4 h-4" />
        {t("dl.check")}
      </Button>

      {result && (
        <div
          className={`rounded-2xl p-4 text-center font-semibold ${
            result.correct
              ? "bg-[var(--success)]/10 text-[var(--success)]"
              : "bg-[var(--muted)]"
          }`}
        >
          {result.correct
            ? t("dl.correct")
            : t("dl.partial", {
                n: result.correctPositions,
                total: result.expected.length,
              })}
        </div>
      )}
    </div>
  );
}
