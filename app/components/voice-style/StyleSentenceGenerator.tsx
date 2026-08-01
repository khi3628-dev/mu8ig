"use client";

import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import type {
  GeneratedSentence,
  StyleProfile,
} from "@/lib/learning/types";
import { Button } from "@/app/components/shared/Button";
import { useProgressStore } from "@/app/state/progressStore";
import { useVoiceStyleStore } from "@/app/state/voiceStyleStore";
import { SituationPicker } from "./SituationPicker";
import { GeneratedSentenceCard } from "./GeneratedSentenceCard";
import { useT } from "@/app/components/shared/T";

interface Props {
  profile: StyleProfile;
}

const VARIANTS: GeneratedSentence["variant"][] = [
  "direct",
  "diplomatic",
  "casual",
];

export function StyleSentenceGenerator({ profile }: Props) {
  const t = useT();
  const [situationId, setSituationId] = useState<string | null>(null);
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const generated = useVoiceStyleStore((s) => s.lastGenerated);
  const setLastGenerated = useVoiceStyleStore((s) => s.setLastGenerated);
  const addSavedSentence = useProgressStore((s) => s.addSavedSentence);
  const recordDaily = useProgressStore((s) => s.recordDaily);

  const run = async () => {
    if (!situationId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/ai/style-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          situationId,
          userIntentKo: intent || undefined,
        }),
      });
      if (!resp.ok) throw new Error("failed");
      const data = await resp.json();
      const list: GeneratedSentence[] = (data.variants ?? []).map(
        (v: { en: string; ko: string; note: string }, i: number) => ({
          id: `gen_${Date.now()}_${i}`,
          situationId,
          variant: VARIANTS[i] ?? "direct",
          en: v.en,
          ko: v.ko,
          note: v.note,
          savedAt: 0,
        }),
      );
      setLastGenerated(list);
      setSaved(new Set());
      recordDaily({ voiceGenerated: list.length });
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const save = (s: GeneratedSentence) => {
    // eslint-disable-next-line react-hooks/purity
    const savedAt = Date.now();
    addSavedSentence({ ...s, savedAt });
    setSaved((prev) => new Set(prev).add(s.id));
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium mb-2">
          {t("vs.pickSituation")}
        </div>
        <SituationPicker value={situationId} onChange={setSituationId} />
      </div>

      <div>
        <label className="text-sm font-medium">{t("vs.intent")}</label>
        <input
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder="예: 지연을 알리면서 다음 스텝 제안"
          className="w-full mt-1 h-11 px-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm"
        />
      </div>

      <Button
        onClick={run}
        disabled={!situationId || loading}
        loading={loading}
        fullWidth
        size="lg"
      >
        <Sparkles className="w-4 h-4" />
        {loading ? t("vs.generating") : t("vs.generate")}
      </Button>

      {error && (
        <div className="text-sm text-[var(--danger)] text-center">
          {error}
        </div>
      )}

      {generated.length > 0 && (
        <div className="space-y-3">
          {generated.map((s) => (
            <GeneratedSentenceCard
              key={s.id}
              sentence={s}
              onSave={() => save(s)}
              saved={saved.has(s.id)}
            />
          ))}
          <Button
            variant="secondary"
            onClick={run}
            disabled={loading}
            fullWidth
          >
            <RefreshCw className="w-4 h-4" />
            {t("vs.regen")}
          </Button>
        </div>
      )}
    </div>
  );
}
