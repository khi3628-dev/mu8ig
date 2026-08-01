"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { DialogueScenario } from "@/lib/learning/types";
import { gradeFillBlank, type FillBlankResult } from "@/lib/learning/dialogues/grading";
import { Button } from "@/app/components/shared/Button";
import { useT } from "@/app/components/shared/T";
import { useLocaleStore } from "@/app/state/localeStore";

interface Props {
  scenario: DialogueScenario;
  onComplete: (result: FillBlankResult) => void;
}

export function FillBlank({ scenario, onComplete }: Props) {
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<FillBlankResult | null>(null);

  const blanks = useMemo(() => scenario.blanks ?? [], [scenario.blanks]);
  const blankByTurn = useMemo(() => {
    const m = new Map<number, (typeof blanks)[0]>();
    for (const b of blanks) m.set(b.turnIndex, b);
    return m;
  }, [blanks]);

  const handleCheck = () => {
    const r = gradeFillBlank(answers, blanks);
    setResult(r);
    if (r.allCorrect) onComplete(r);
  };

  const handleReset = () => {
    setAnswers({});
    setResult(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[var(--muted)] p-4 text-sm">
        {scenario.contextKo}
      </div>

      <ol className="space-y-3">
        {scenario.turns.map((turn, i) => {
          const blank = blankByTurn.get(i);
          const enParts = turn.en.split("______");
          const grade = result?.grades.find((g) => g.turnIndex === i);

          return (
            <li
              key={i}
              className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-3"
            >
              <div className="text-[11px] uppercase text-[var(--muted-foreground)] font-semibold">
                {turn.speaker}
              </div>
              <div className="mt-1 text-base leading-relaxed">
                {enParts.map((part, idx) => (
                  <span key={idx}>
                    {part}
                    {idx < enParts.length - 1 && blank ? (
                      <input
                        value={answers[i] ?? ""}
                        onChange={(e) =>
                          setAnswers((a) => ({ ...a, [i]: e.target.value }))
                        }
                        placeholder={blank.hintKo}
                        disabled={result?.allCorrect}
                        className={`inline-block mx-1 w-32 h-8 px-2 rounded border text-sm ${
                          grade
                            ? grade.correct
                              ? "border-[var(--success)] bg-[var(--success)]/10"
                              : "border-[var(--danger)] bg-[var(--danger)]/10"
                            : "border-[var(--border)] bg-[var(--muted)]"
                        }`}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                      />
                    ) : null}
                  </span>
                ))}
              </div>
              {locale === "ko" && (
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {turn.ko}
                </div>
              )}
              {grade && !grade.correct && (
                <div className="mt-2 text-xs text-[var(--danger)]">
                  {t("dl.reveal")}: <strong>{grade.expected}</strong>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex gap-2">
        {!result?.allCorrect && (
          <Button onClick={handleCheck} fullWidth>
            <Check className="w-4 h-4" />
            {t("dl.check")}
          </Button>
        )}
        {result && !result.allCorrect && (
          <Button variant="secondary" onClick={handleReset}>
            {t("common.retry")}
          </Button>
        )}
      </div>

      {result && (
        <div
          className={`rounded-2xl p-4 text-center font-semibold ${
            result.allCorrect
              ? "bg-[var(--success)]/10 text-[var(--success)]"
              : "bg-[var(--muted)]"
          }`}
        >
          {result.allCorrect
            ? t("dl.correct")
            : t("dl.partial", { n: result.correct, total: result.total })}
        </div>
      )}
    </div>
  );
}
