"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useVoiceStyleStore } from "@/app/state/voiceStyleStore";
import { useHasMounted } from "@/app/state/useHasMounted";
import { VoiceRecorder } from "@/app/components/voice-style/VoiceRecorder";
import { TranscriptEditor } from "@/app/components/voice-style/TranscriptEditor";
import { StyleProfileCard } from "@/app/components/voice-style/StyleProfileCard";
import { StyleSentenceGenerator } from "@/app/components/voice-style/StyleSentenceGenerator";
import { Button } from "@/app/components/shared/Button";
import { useT } from "@/app/components/shared/T";

export default function VoiceStylePage() {
  const t = useT();
  const mounted = useHasMounted();
  const profile = useVoiceStyleStore((s) => s.profile);
  const setProfile = useVoiceStyleStore((s) => s.setProfile);
  const addTranscript = useVoiceStyleStore((s) => s.addTranscript);
  const transcripts = useVoiceStyleStore((s) => s.transcripts);
  const clearAll = useVoiceStyleStore((s) => s.clearAll);

  const [draft, setDraft] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    const koText = draft.trim();
    if (!koText) return;
    setAnalyzing(true);
    setError(null);
    try {
      addTranscript(koText);
      const resp = await fetch("/api/ai/style-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ koTexts: [koText] }),
      });
      if (!resp.ok) throw new Error("failed");
      const data = await resp.json();
      setProfile({ ...data, generatedAt: Date.now() });
    } catch {
      setError(t("common.error"));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--accent)]" />
          {t("vs.title")}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("vs.subtitle")}
        </p>
      </header>

      <ol className="grid grid-cols-2 gap-2 text-[11px] text-[var(--muted-foreground)]">
        {(["vs.step1", "vs.step2", "vs.step3", "vs.step4"] as const).map(
          (k) => (
            <li
              key={k}
              className="rounded-lg bg-[var(--muted)] px-3 py-2"
            >
              {t(k)}
            </li>
          ),
        )}
      </ol>

      <VoiceRecorder
        onTranscript={(txt) => setDraft((d) => (d ? `${d} ${txt}` : txt))}
      />

      <TranscriptEditor value={draft} onChange={setDraft} />

      <Button
        onClick={analyze}
        disabled={!draft.trim() || analyzing}
        loading={analyzing}
        size="lg"
        fullWidth
      >
        <Sparkles className="w-4 h-4" />
        {analyzing ? t("vs.analyzing") : t("vs.analyze")}
      </Button>
      {error && (
        <div className="text-sm text-[var(--danger)] text-center">
          {error}
        </div>
      )}

      {mounted && profile && (
        <>
          <StyleProfileCard profile={profile} />
          <StyleSentenceGenerator profile={profile} />
        </>
      )}

      {mounted && transcripts.length > 0 && (
        <div className="text-xs text-center">
          <button
            onClick={clearAll}
            className="text-[var(--muted-foreground)] hover:text-[var(--danger)] underline"
          >
            데이터 삭제 (transcripts / profile / generated)
          </button>
        </div>
      )}
    </div>
  );
}
