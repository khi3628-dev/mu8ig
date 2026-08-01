"use client";

import Link from "next/link";
import { CalendarCheck2, ArrowRight } from "lucide-react";
import { useProgressStore } from "@/app/state/progressStore";
import { useLocaleStore } from "@/app/state/localeStore";
import { useHasMounted } from "@/app/state/useHasMounted";
import { pickToday } from "@/lib/learning/daily/pickToday";
import { todayISO } from "@/lib/learning/daily/streak";
import dailyData from "@/lib/data/daily-challenges.json";
import type { DailyChallenge } from "@/lib/learning/types";
import { useT } from "@/app/components/shared/T";

const challenges = dailyData as DailyChallenge[];

export function DailyChallengeCard() {
  const t = useT();
  const mounted = useHasMounted();
  const locale = useLocaleStore((s) => s.locale);
  const history = useProgressStore((s) => s.dailyHistory);
  const today = pickToday(challenges);
  if (!today) return null;

  const doneToday = mounted
    ? Boolean(history[todayISO()]?.challengeCompleted)
    : false;

  const title = locale === "ko" ? today.titleKo : today.titleEn;
  const desc = locale === "ko" ? today.descriptionKo : today.descriptionEn;

  return (
    <Link
      href="/daily"
      className="block rounded-2xl p-5 bg-gradient-to-br from-[var(--brand)] to-indigo-500 text-white shadow-md hover:shadow-lg transition"
    >
      <div className="flex items-center gap-2 text-xs opacity-90">
        <CalendarCheck2 className="w-4 h-4" />
        {t("home.daily.today")}
      </div>
      <div className="mt-2 text-lg font-bold leading-tight">{title}</div>
      <div className="mt-1 text-sm opacity-95">{desc}</div>
      <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold">
        {doneToday ? t("home.daily.done") : t("home.daily.start")}
        {!doneToday && <ArrowRight className="w-4 h-4" />}
      </div>
    </Link>
  );
}
