"use client";

import { useProgressStore } from "@/app/state/progressStore";
import { useVoiceStyleStore } from "@/app/state/voiceStyleStore";
import { useSettingsStore } from "@/app/state/settingsStore";
import { useHasMounted } from "@/app/state/useHasMounted";
import { StreakCalendar } from "@/app/components/daily/StreakCalendar";
import { Button } from "@/app/components/shared/Button";
import { useT } from "@/app/components/shared/T";
import { Trophy, Flame, Sparkles, Sun } from "lucide-react";

export default function StatsPage() {
  const t = useT();
  const mounted = useHasMounted();
  const streak = useProgressStore((s) => s.streak);
  const bestWordChain = useProgressStore((s) => s.bestScores.wordChain);
  const srsSize = useProgressStore((s) =>
    Object.keys(s.flashcardSRS).length,
  );
  const savedSentences = useProgressStore((s) => s.savedSentences);
  const resetProgress = useProgressStore((s) => s.reset);
  const clearVoice = useVoiceStyleStore((s) => s.clearAll);
  const aiEnabled = useSettingsStore((s) => s.aiEnabled);
  const setAiEnabled = useSettingsStore((s) => s.setAiEnabled);

  const doReset = () => {
    if (typeof window !== "undefined") {
      const ok = window.confirm("모든 진행 상황을 초기화할까요?");
      if (!ok) return;
      resetProgress();
      clearVoice();
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">{t("stats.title")}</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatBox
          Icon={Flame}
          label={t("stats.streak")}
          value={mounted ? String(streak.current) : "–"}
          hint={mounted ? `longest ${streak.longest}` : ""}
        />
        <StatBox
          Icon={Trophy}
          label={t("home.stats.wordChain")}
          value={mounted ? String(bestWordChain) : "–"}
        />
        <StatBox
          Icon={Sun}
          label={t("home.stats.cards")}
          value={mounted ? String(srsSize) : "–"}
        />
        <StatBox
          Icon={Sparkles}
          label={t("stats.savedSentences")}
          value={mounted ? String(savedSentences.length) : "–"}
        />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-[var(--muted-foreground)] mb-2">
          Last 28 days
        </h2>
        <StreakCalendar days={28} />
      </section>

      <section className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">{t("settings.aiToggle")}</div>
            <div className="text-xs text-[var(--muted-foreground)]">
              {aiEnabled ? t("settings.aiOn") : t("settings.aiOff")}
            </div>
          </div>
          <button
            onClick={() => setAiEnabled(!aiEnabled)}
            className={`w-11 h-6 rounded-full relative transition ${
              aiEnabled ? "bg-[var(--brand)]" : "bg-[var(--border)]"
            }`}
            aria-label="Toggle AI"
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition ${
                aiEnabled ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </section>

      {mounted && savedSentences.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--muted-foreground)] mb-2">
            {t("stats.savedSentences")}
          </h2>
          <ul className="space-y-2">
            {savedSentences.slice(0, 20).map((s) => (
              <li
                key={s.id}
                className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-3"
              >
                <div className="text-sm font-medium">{s.en}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-1">
                  {s.ko}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Button variant="ghost" onClick={doReset} className="w-full">
        {t("stats.reset")}
      </Button>
    </div>
  );
}

function StatBox({
  Icon,
  label,
  value,
  hint,
}: {
  Icon: typeof Flame;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4 text-center">
      <Icon className="w-4 h-4 mx-auto text-[var(--muted-foreground)]" />
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
      <div className="text-[11px] text-[var(--muted-foreground)]">{label}</div>
      {hint && (
        <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
          {hint}
        </div>
      )}
    </div>
  );
}
