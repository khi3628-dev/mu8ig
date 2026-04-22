import type {
  FourDResult,
  FourDJackpotResult,
  FiveDResult,
  SixDResult,
  PickNofMResult,
} from "@/lib/games/types";

function NumChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded bg-(--muted) font-mono text-sm">
      {children}
    </span>
  );
}

function PrimaryDigit({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-10 h-10 px-2 rounded bg-(--brand) text-(--brand-foreground) font-mono text-base font-bold">
      {children}
    </span>
  );
}

export function DrawResultDisplay({
  kind,
  result,
  compact = false,
}: {
  kind: string;
  result: unknown;
  compact?: boolean;
}) {
  if (!result) {
    return (
      <div className="text-sm text-(--muted-foreground)">결과 없음</div>
    );
  }

  if (kind === "FOUR_D") {
    const r = result as FourDResult;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-(--muted-foreground) mb-1">1st</div>
            <PrimaryDigit>{r.first}</PrimaryDigit>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-(--muted-foreground) mb-1">2nd</div>
            <PrimaryDigit>{r.second}</PrimaryDigit>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-(--muted-foreground) mb-1">3rd</div>
            <PrimaryDigit>{r.third}</PrimaryDigit>
          </div>
        </div>
        {!compact && (
          <>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-(--muted-foreground) mb-1">
                Special
              </div>
              <div className="flex flex-wrap gap-1">
                {r.special.map((n, i) => (
                  <NumChip key={i}>{n}</NumChip>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-(--muted-foreground) mb-1">
                Consolation
              </div>
              <div className="flex flex-wrap gap-1">
                {r.consolation.map((n, i) => (
                  <NumChip key={i}>{n}</NumChip>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (kind === "FOUR_D_JACKPOT") {
    const r = result as FourDJackpotResult;
    return (
      <div className="space-y-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-(--muted-foreground) mb-1">
            Jackpot 1
          </div>
          <div className="flex items-center gap-2">
            <PrimaryDigit>{r.jackpot1[0]}</PrimaryDigit>
            <span className="text-(--muted-foreground)">+</span>
            <PrimaryDigit>{r.jackpot1[1]}</PrimaryDigit>
          </div>
        </div>
        {!compact && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-(--muted-foreground) mb-1">
              Jackpot 2 Pool ({r.jackpot2Pool.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {r.jackpot2Pool.map(([a, b], i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-1 border border-(--border) rounded px-2 py-1"
                >
                  <span className="font-mono text-sm">{a}</span>
                  <span className="text-(--muted-foreground)">+</span>
                  <span className="font-mono text-sm">{b}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (kind === "FIVE_D" || kind === "SIX_D") {
    const r = result as FiveDResult | SixDResult;
    const entries: [string, string | undefined][] = [
      ["1st", r.first],
      ["2nd", r.second],
      ["3rd", r.third],
      ["4th", r.fourth],
      ["5th", r.fifth],
      ["6th", r.sixth],
    ];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {entries
          .filter(([, v]) => v != null)
          .map(([label, v]) => (
            <div key={label}>
              <div className="text-[10px] uppercase tracking-wider text-(--muted-foreground) mb-1">
                {label}
              </div>
              <span className="font-mono text-base font-semibold">{v}</span>
            </div>
          ))}
      </div>
    );
  }

  if (kind === "PICK_N_OF_M") {
    const r = result as PickNofMResult;
    return (
      <div className="flex flex-wrap items-center gap-2">
        {r.main.map((n, i) => (
          <PrimaryDigit key={i}>{n}</PrimaryDigit>
        ))}
        <span className="text-(--muted-foreground) mx-1">+ 보너스</span>
        <span className="inline-flex items-center justify-center min-w-10 h-10 px-2 rounded border-2 border-(--brand) text-(--brand) font-mono text-base font-bold">
          {r.bonus}
        </span>
      </div>
    );
  }

  return <div className="text-sm text-(--muted-foreground)">{kind}</div>;
}
