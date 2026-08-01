"use client";

import { Zap, Layers, MessageSquare, CalendarCheck2, Mic } from "lucide-react";
import { ModeTile } from "@/app/components/home/ModeTile";
import { StreakSummary } from "@/app/components/home/StreakSummary";
import { DailyChallengeCard } from "@/app/components/home/DailyChallengeCard";
import { useT } from "@/app/components/shared/T";

export default function HomePage() {
  const t = useT();
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("home.hero.title")}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {t("home.hero.subtitle")}
        </p>
      </section>

      <StreakSummary />

      <DailyChallengeCard />

      <section className="space-y-3">
        <ModeTile
          href="/voice-style"
          Icon={Mic}
          title={t("home.mode.voiceStyle.title")}
          desc={t("home.mode.voiceStyle.desc")}
          highlight
        />
        <ModeTile
          href="/word-chain"
          Icon={Zap}
          title={t("home.mode.wordChain.title")}
          desc={t("home.mode.wordChain.desc")}
        />
        <ModeTile
          href="/flashcards"
          Icon={Layers}
          title={t("home.mode.flashcards.title")}
          desc={t("home.mode.flashcards.desc")}
        />
        <ModeTile
          href="/dialogues"
          Icon={MessageSquare}
          title={t("home.mode.dialogues.title")}
          desc={t("home.mode.dialogues.desc")}
        />
        <ModeTile
          href="/daily"
          Icon={CalendarCheck2}
          title={t("home.mode.daily.title")}
          desc={t("home.mode.daily.desc")}
        />
      </section>
    </div>
  );
}
