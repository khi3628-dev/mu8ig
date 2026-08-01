"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { useProgressStore } from "@/app/state/progressStore";
import { useHasMounted } from "@/app/state/useHasMounted";
import { useLocaleStore } from "@/app/state/localeStore";
import { pickToday } from "@/lib/learning/daily/pickToday";
import { todayISO } from "@/lib/learning/daily/streak";
import type { DailyChallenge } from "@/lib/learning/types";
import dailyData from "@/lib/data/daily-challenges.json";
import { Button } from "@/app/components/shared/Button";
import { useT } from "@/app/components/shared/T";

const challenges = dailyData as DailyChallenge[];

function hrefFor(c: DailyChallenge): string {
  switch (c.kind) {
    case "word-chain":
      return "/word-chain";
    case "flashcards": {
      const cat = (c.payload?.category as string) ?? "opening";
      return `/flashcards/${cat}`;
    }
    case "dialogue": {
      const id = (c.payload?.scenarioId as string) ?? "meet-01";
      return `/dialogues/${id}`;
    }
    case "voice-style":
      return "/voice-style";
    default:
      return "/";
  }
}

export function DailyChallengeRunner() {
  const t = useT();
  const mounted = useHasMounted();
  const locale = useLocaleStore((s) => s.locale);
  const history = useProgressStore((s) => s.dailyHistory);
  const streak = useProgressStore((s) => s.streak);
  const recordDailyCompletion = useProgressStore(
    (s) => s.recordDailyCompletion,
  );

  const today = pickToday(challenges);
  if (!today) return null;

  const iso = todayISO();
  const done = mounted && Boolean(history[iso]?.challengeCompleted);
  const title = locale === "ko" ? today.titleKo : today.titleEn;
  const desc = locale === "ko" ? today.descriptionKo : today.descriptionEn;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-br from-[var(--brand)] to-indigo-500 text-white p-6 shadow-md">
        <div className="flex items-center gap-2 text-xs opacity-90">
          <Sparkles className="w-3.5 h-3.5" />
          {t("home.daily.today")}
        </div>
        <h2 className="mt-2 text-2xl font-bold leading-tight">{title}</h2>
        <p className="mt-1 opacity-95">{desc}</p>
        <div className="mt-4 flex items-center gap-2">
          <Link href={hrefFor(today)}>
            <Button variant="accent">
              {t("home.daily.start")}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            variant="secondary"
            onClick={() => recordDailyCompletion()}
            disabled={done}
            className="!bg-white/15 !text-white !border-white/25 hover:!bg-white/25"
          >
            <CheckCircle2 className="w-4 h-4" />
            {done ? t("home.daily.done") : t("common.done")}
          </Button>
        </div>
      </div>

      {mounted && done && (
        <div className="rounded-2xl bg-[var(--success)]/10 border border-[var(--success)]/30 p-4 text-center">
          <div className="font-semibold text-[var(--success)]">
            {t("daily.completed", { pts: today.rewardPoints })}
          </div>
          <div className="text-sm text-[var(--muted-foreground)]">
            {t("daily.streakUp", { n: streak.current })}
          </div>
        </div>
      )}
    </div>
  );
}
