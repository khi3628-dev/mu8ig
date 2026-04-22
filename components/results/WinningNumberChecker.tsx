"use client";

import { useState } from "react";
import { senToMyr } from "@/lib/currency";

type GameOption = {
  slug: string;
  name: string;
  kind: string;
  digitCount: number | null;
  pickCount: number | null;
  poolSize: number | null;
};

type CheckResponse = {
  draw: {
    id: string;
    drawNumber: string;
    scheduledAt: string;
  };
  betType: string;
  matched: { rank: number; label: string; payoutSen: number } | null;
};

function selectionForInput(
  game: GameOption,
  digits: string,
  numbers: string,
): unknown | null {
  if (game.kind === "FOUR_D" || game.kind === "FIVE_D" || game.kind === "SIX_D") {
    const need = game.digitCount ?? 0;
    if (digits.length !== need) return null;
    return { digits };
  }
  if (game.kind === "FOUR_D_JACKPOT") {
    return null; // not supported in checker UI
  }
  if (game.kind === "PICK_N_OF_M") {
    const parts = numbers
      .split(/[\s,]+/)
      .map((s) => Number(s))
      .filter((n) => Number.isInteger(n) && n > 0);
    const need = game.pickCount ?? 0;
    if (parts.length !== need) return null;
    return { numbers: parts };
  }
  return null;
}

export function WinningNumberChecker({ games }: { games: GameOption[] }) {
  const checkable = games.filter((g) => g.kind !== "FOUR_D_JACKPOT");
  const [slug, setSlug] = useState(checkable[0]?.slug ?? "");
  const [digits, setDigits] = useState("");
  const [numbers, setNumbers] = useState("");
  const [betType, setBetType] = useState("BIG");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const game = checkable.find((g) => g.slug === slug);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!game) return;
    const selection = selectionForInput(game, digits, numbers);
    if (!selection) {
      setError("입력값이 올바르지 않습니다. 요구된 길이/개수를 확인해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          gameSlug: slug,
          betType: game.kind === "FOUR_D" ? betType : undefined,
          selection,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "요청 실패");
      } else {
        setResult(data as CheckResponse);
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 rounded-lg border border-(--border)"
    >
      <div>
        <label className="block text-xs text-(--muted-foreground) mb-1">게임</label>
        <select
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setResult(null);
            setError(null);
          }}
          className="w-full rounded-md border border-(--border) bg-(--background) px-3 py-2 text-sm"
        >
          {checkable.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.name}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-(--muted-foreground) mt-1">
          * Toto 4D Jackpot 은 현재 확인기에서 지원되지 않습니다.
        </p>
      </div>

      {game?.kind === "FOUR_D" && (
        <div>
          <label className="block text-xs text-(--muted-foreground) mb-1">
            베팅 유형
          </label>
          <div className="flex gap-2">
            {(["BIG", "SMALL", "IBOX"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setBetType(t)}
                className={`px-3 py-1.5 rounded-md border text-sm ${
                  betType === t
                    ? "bg-(--brand) text-(--brand-foreground) border-(--brand)"
                    : "border-(--border) hover:bg-(--muted)"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {game &&
        (game.kind === "FOUR_D" ||
          game.kind === "FIVE_D" ||
          game.kind === "SIX_D") && (
          <div>
            <label className="block text-xs text-(--muted-foreground) mb-1">
              숫자 ({game.digitCount}자리)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={game.digitCount ?? undefined}
              value={digits}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-md border border-(--border) bg-(--background) px-3 py-2 font-mono text-lg tracking-widest"
              placeholder={"0".repeat(game.digitCount ?? 4)}
            />
          </div>
        )}

      {game?.kind === "PICK_N_OF_M" && (
        <div>
          <label className="block text-xs text-(--muted-foreground) mb-1">
            번호 {game.pickCount}개 (1 ~ {game.poolSize}, 공백/쉼표로 구분)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={numbers}
            onChange={(e) => setNumbers(e.target.value)}
            className="w-full rounded-md border border-(--border) bg-(--background) px-3 py-2 font-mono text-lg"
            placeholder="예: 3 14 22 27 38 41"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-(--brand) text-(--brand-foreground) px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "확인 중..." : "최신 결과와 비교"}
      </button>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {result && (
        <div className="rounded-md border border-(--border) p-4 space-y-2">
          <div className="text-xs text-(--muted-foreground)">
            Draw #{result.draw.drawNumber} ·{" "}
            {new Date(result.draw.scheduledAt).toLocaleDateString("ko-KR")}
          </div>
          {result.matched ? (
            <div>
              <div className="text-lg font-bold text-(--brand)">🎉 당첨</div>
              <div className="text-sm">
                {result.matched.label} — 예상 상금{" "}
                <strong>{senToMyr(result.matched.payoutSen)}</strong>
              </div>
              <div className="text-[11px] text-(--muted-foreground)">
                * 시뮬레이션 상금이며 실제 지급과 무관합니다.
              </div>
            </div>
          ) : (
            <div className="text-sm">
              입력하신 번호는 이 드로우에서 당첨 등급에 해당하지 않습니다.
            </div>
          )}
        </div>
      )}
    </form>
  );
}
