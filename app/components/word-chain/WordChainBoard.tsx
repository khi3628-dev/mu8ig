"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Play } from "lucide-react";
import { useWordChainStore } from "@/app/state/wordChainStore";
import { useProgressStore } from "@/app/state/progressStore";
import { useSettingsStore } from "@/app/state/settingsStore";
import { useLocaleStore } from "@/app/state/localeStore";
import { validateChain, lastChar, normalize } from "@/lib/learning/word-chain/rules";
import { dictionaryHas, findWord, pickStarterWord } from "@/lib/learning/word-chain/seed";
import { computeScore } from "@/lib/learning/word-chain/scoring";
import { WordInput } from "./WordInput";
import { ChainTimeline } from "./ChainTimeline";
import { ScorePanel } from "./ScorePanel";
import { GameOverModal } from "./GameOverModal";
import { Button } from "@/app/components/shared/Button";
import { useT } from "@/app/components/shared/T";

export function WordChainBoard() {
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const {
    running,
    chain,
    score,
    combo,
    endsAt,
    startGame,
    endGame,
    addWord,
    bumpCombo,
    resetCombo,
  } = useWordChainStore();
  const { updateBestScore, recordDaily } = useProgressStore();
  const best = useProgressStore((s) => s.bestScores.wordChain);
  const aiEnabled = useSettingsStore((s) => s.aiEnabled);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showOver, setShowOver] = useState(false);
  const [starter, setStarter] = useState<string | null>(null);
  const lastActionRef = useRef<number>(0);

  const chainWords = useMemo(() => chain.map((c) => c.word), [chain]);
  const requiredStart = chain.length
    ? lastChar(chain[chain.length - 1].word)
    : starter
      ? lastChar(starter)
      : null;

  const handleExpire = useCallback(() => {
    if (running) {
      endGame();
      setShowOver(true);
      updateBestScore("wordChain", score);
      recordDaily({ wordChainScore: score });
    }
  }, [running, endGame, score, updateBestScore, recordDaily]);

  const handleStart = () => {
    const start = pickStarterWord();
    setStarter(start.word);
    setError(null);
    setShowOver(false);
    lastActionRef.current = Date.now();
    startGame(60_000);
  };

  const handleSubmit = async (raw: string, useAi: boolean) => {
    setError(null);
    setSubmitting(true);
    try {
      const normalized = normalize(raw);
      const result = validateChain({
        word: normalized,
        lastChar: requiredStart,
        history: chainWords,
        dictionaryHas,
      });

      let validatedBy: "seed" | "ai" = "seed";

      if (!result.ok) {
        if (result.reason === "not-found" && useAi) {
          const resp = await fetch("/api/ai/validate-word", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              word: normalized,
              lastChar: requiredStart,
              history: chainWords,
            }),
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.valid) {
              validatedBy = "ai";
            } else {
              setError(
                data.reason ||
                  (locale === "ko"
                    ? t("wc.notFound")
                    : "Not in dictionary."),
              );
              resetCombo();
              return;
            }
          } else {
            setError(t("wc.notFound"));
            resetCombo();
            return;
          }
        } else {
          const map: Record<string, string> = {
            "too-short": t("wc.tooShort"),
            "wrong-start": t("wc.invalidStart", {
              c: (requiredStart ?? "").toUpperCase(),
            }),
            duplicate: t("wc.duplicate"),
            "not-found": t("wc.notFound"),
          };
          setError(map[result.reason] || t("common.error"));
          resetCombo();
          return;
        }
      }

      const now = Date.now();
      const secondsSinceLast = Math.floor((now - lastActionRef.current) / 1000);
      const speedInput = Math.max(0, 15 - secondsSinceLast);

      const delta = computeScore({
        length: normalize(raw).replace(/[^a-z]/g, "").length,
        combo,
        secondsLeftFromLastAction: speedInput,
      });

      addWord({
        word: normalized,
        validatedBy,
        scoreDelta: delta,
        timestampMs: now,
      });
      bumpCombo();
      lastActionRef.current = now;
    } finally {
      setSubmitting(false);
    }
  };

  const isNewBest = score > 0 && score >= best;
  const currentWord =
    chain.length > 0 ? chain[chain.length - 1].word : starter;
  const currentMeaning = currentWord
    ? findWord(currentWord)?.definitionKo
    : undefined;

  return (
    <div className="space-y-4">
      <ScorePanel
        score={score}
        combo={combo}
        endsAt={running ? endsAt : null}
        onExpire={handleExpire}
      />

      {starter && (
        <div className="rounded-2xl bg-[var(--brand-muted)] border border-[var(--brand)]/30 p-3 text-sm">
          <div className="text-[11px] uppercase text-[var(--brand)] font-semibold">
            {chain.length === 0 ? "Starter" : "Last"}
          </div>
          <div className="text-lg font-semibold">{currentWord}</div>
          {currentMeaning && (
            <div className="text-xs text-[var(--muted-foreground)]">
              {currentMeaning}
            </div>
          )}
        </div>
      )}

      <ChainTimeline chain={chain} lastChar={requiredStart} />

      {running ? (
        <WordInput
          lastChar={requiredStart}
          onSubmit={handleSubmit}
          aiEnabled={aiEnabled}
          submitting={submitting}
          error={error}
        />
      ) : (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="text-sm text-[var(--muted-foreground)]">
            {chain.length > 0
              ? `${t("wc.finalScore")}: ${score}`
              : t("wc.subtitle")}
          </div>
          <Button size="lg" onClick={handleStart}>
            <Play className="w-4 h-4" />
            {chain.length > 0 ? t("wc.playAgain") : t("wc.start")}
          </Button>
        </div>
      )}

      {showOver && (
        <GameOverModal
          score={score}
          best={best}
          isNewBest={isNewBest}
          onClose={() => setShowOver(false)}
          onPlayAgain={() => {
            setShowOver(false);
            handleStart();
          }}
        />
      )}
    </div>
  );
}
