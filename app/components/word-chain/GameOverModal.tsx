"use client";

import { Trophy, PartyPopper } from "lucide-react";
import { Button } from "@/app/components/shared/Button";
import { useT } from "@/app/components/shared/T";

interface Props {
  score: number;
  best: number;
  isNewBest: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
}

export function GameOverModal({
  score,
  best,
  isNewBest,
  onClose,
  onPlayAgain,
}: Props) {
  const t = useT();
  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-[var(--card)] border border-[var(--border)] p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {isNewBest ? (
          <PartyPopper className="w-10 h-10 mx-auto text-[var(--accent)]" />
        ) : (
          <Trophy className="w-10 h-10 mx-auto text-[var(--muted-foreground)]" />
        )}
        <div className="mt-2 text-lg font-semibold">
          {isNewBest ? t("wc.newBest") : t("wc.gameOver")}
        </div>
        <div className="mt-4 text-4xl font-bold tabular-nums">{score}</div>
        <div className="text-xs text-[var(--muted-foreground)] mt-1">
          {t("wc.finalScore")} · best {best}
        </div>
        <div className="mt-6 flex gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            fullWidth
          >
            {t("common.close")}
          </Button>
          <Button onClick={onPlayAgain} fullWidth>
            {t("wc.playAgain")}
          </Button>
        </div>
      </div>
    </div>
  );
}
