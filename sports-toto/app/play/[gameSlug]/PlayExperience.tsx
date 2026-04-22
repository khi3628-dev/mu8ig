"use client";

import { useMemo, useState } from "react";
import { NumberGrid } from "@/components/picker/NumberGrid";
import { DigitInput } from "@/components/picker/DigitInput";
import { QuickPickButton } from "@/components/picker/QuickPickButton";
import { BetTypeSelector } from "@/components/betslip/BetTypeSelector";
import { StakeInput } from "@/components/betslip/StakeInput";
import { BetSlip } from "@/components/betslip/BetSlip";
import { useBetSlipStore } from "@/state/betSlipStore";
import { senToMyr } from "@/lib/currency";
import {
  quickPickDigits,
  quickPickNumbers,
} from "@/lib/games/quickPick";
import {
  computeMultiplier,
  computeTotalCostSen,
} from "@/lib/games/cost";
import type { GameKind, Selection } from "@/lib/games/types";
import { BET_TYPES } from "@/lib/games/types";

type GameLite = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  pickCount: number | null;
  poolSize: number | null;
  digitCount: number | null;
  minStakeSen: number;
};

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function PlayExperience({ game }: { game: GameLite }) {
  const kind = game.kind as GameKind;
  const addLine = useBetSlipStore((s) => s.addLine);

  const defaultBetType = BET_TYPES[kind][0] ?? "STRAIGHT";
  const [betType, setBetType] = useState<string>(defaultBetType);
  const [stakeSen, setStakeSen] = useState<number>(game.minStakeSen);

  // digit-based games
  const digitCount = game.digitCount ?? 4;
  const [digits, setDigits] = useState<string>("");
  const [digitsA, setDigitsA] = useState<string>(""); // 4D Jackpot pair A
  const [digitsB, setDigitsB] = useState<string>(""); // 4D Jackpot pair B

  // pick-n-of-m
  const pickCount = game.pickCount ?? 6;
  const poolSize = game.poolSize ?? 55;
  const [numbers, setNumbers] = useState<number[]>([]);

  const allowRoll =
    kind === "FOUR_D" && (betType === "ROLL" || betType === "SYSTEM");

  const selection = useMemo<Selection | null>(() => {
    if (kind === "FOUR_D") {
      // ROLL allows one 'R' among 4 chars; otherwise exactly digitCount digits.
      if (betType === "ROLL" || betType === "SYSTEM") {
        const ok =
          digits.length === digitCount &&
          /^[0-9R]+$/.test(digits) &&
          (digits.match(/R/g)?.length ?? 0) === 1;
        return ok ? { digits } : null;
      }
      return digits.length === digitCount && /^\d+$/.test(digits)
        ? { digits }
        : null;
    }
    if (kind === "FOUR_D_JACKPOT") {
      const okA = digitsA.length === 4 && /^\d+$/.test(digitsA);
      const okB = digitsB.length === 4 && /^\d+$/.test(digitsB);
      return okA && okB ? { digitsA, digitsB } : null;
    }
    if (kind === "FIVE_D" || kind === "SIX_D") {
      return digits.length === digitCount && /^\d+$/.test(digits)
        ? { digits }
        : null;
    }
    if (kind === "PICK_N_OF_M") {
      return numbers.length === pickCount ? { numbers } : null;
    }
    return null;
  }, [kind, betType, digits, digitsA, digitsB, numbers, digitCount, pickCount]);

  const multiplier = selection
    ? computeMultiplier(kind, betType, selection)
    : 1;
  const totalCostSen = computeTotalCostSen(stakeSen, multiplier);

  function handleQuickPick() {
    if (kind === "FOUR_D") {
      if (betType === "ROLL" || betType === "SYSTEM") {
        const digitsAll = quickPickDigits(digitCount);
        const rollPos = Math.floor(Math.random() * digitCount);
        setDigits(
          digitsAll
            .split("")
            .map((c, i) => (i === rollPos ? "R" : c))
            .join(""),
        );
      } else {
        setDigits(quickPickDigits(digitCount));
      }
    } else if (kind === "FOUR_D_JACKPOT") {
      setDigitsA(quickPickDigits(4));
      setDigitsB(quickPickDigits(4));
    } else if (kind === "FIVE_D" || kind === "SIX_D") {
      setDigits(quickPickDigits(digitCount));
    } else if (kind === "PICK_N_OF_M") {
      setNumbers(quickPickNumbers(poolSize, pickCount));
    }
  }

  function handleClear() {
    setDigits("");
    setDigitsA("");
    setDigitsB("");
    setNumbers([]);
  }

  function handleAddToSlip() {
    if (!selection) return;
    addLine({
      gameId: game.id,
      gameSlug: game.slug,
      gameName: game.name,
      gameKind: game.kind,
      selection,
      betType,
      stakeSen,
      multiplier,
      totalCostSen,
      idempotencyKey: newIdempotencyKey(),
    });
    handleClear();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
      <section className="space-y-6 rounded-lg border border-(--border) p-4 sm:p-6">
        <BetTypeSelector kind={kind} value={betType} onChange={setBetType} />

        <div className="flex items-center justify-between">
          <h3 className="font-semibold">번호 선택</h3>
          <div className="flex gap-2">
            <QuickPickButton onClick={handleQuickPick} />
            {selection && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-(--muted-foreground) underline underline-offset-2"
              >
                지우기
              </button>
            )}
          </div>
        </div>

        {(kind === "FOUR_D" || kind === "FIVE_D" || kind === "SIX_D") && (
          <div>
            <DigitInput
              length={digitCount}
              value={digits}
              onChange={setDigits}
              allowRoll={allowRoll}
            />
            {allowRoll && (
              <p className="text-[11px] text-(--muted-foreground) mt-2">
                한 자리에 &quot;R&quot; 을 입력하면 해당 자리가 0~9 로 롤되어
                10개의 티켓으로 확장됩니다.
              </p>
            )}
          </div>
        )}

        {kind === "FOUR_D_JACKPOT" && (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-(--muted-foreground) mb-1.5">쌍 A</div>
              <DigitInput length={4} value={digitsA} onChange={setDigitsA} />
            </div>
            <div>
              <div className="text-xs text-(--muted-foreground) mb-1.5">쌍 B</div>
              <DigitInput length={4} value={digitsB} onChange={setDigitsB} />
            </div>
          </div>
        )}

        {kind === "PICK_N_OF_M" && (
          <NumberGrid
            poolSize={poolSize}
            pickCount={pickCount}
            selected={numbers}
            onChange={setNumbers}
          />
        )}

        <StakeInput
          stakeSen={stakeSen}
          onChange={setStakeSen}
          minStakeSen={game.minStakeSen}
        />

        <div className="rounded-md bg-(--muted) p-3 text-sm flex items-baseline justify-between">
          <div className="text-(--muted-foreground)">
            {senToMyr(stakeSen)} × {multiplier} ={" "}
            <strong className="text-(--foreground)">
              {senToMyr(totalCostSen)}
            </strong>
          </div>
          <button
            type="button"
            onClick={handleAddToSlip}
            disabled={!selection}
            className="inline-flex items-center rounded-md bg-(--brand) text-(--brand-foreground) px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            슬립에 추가
          </button>
        </div>
      </section>

      <div className="lg:sticky lg:top-20">
        <BetSlip />
      </div>
    </div>
  );
}
