"use client";

import { DailyChallengeRunner } from "@/app/components/daily/DailyChallengeRunner";
import { StreakCalendar } from "@/app/components/daily/StreakCalendar";
import { useT } from "@/app/components/shared/T";

export default function DailyPage() {
  const t = useT();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">{t("daily.title")}</h1>
      </header>
      <DailyChallengeRunner />
      <section>
        <h2 className="text-sm font-semibold text-[var(--muted-foreground)] mb-2">
          {t("stats.streak")}
        </h2>
        <StreakCalendar />
      </section>
    </div>
  );
}
