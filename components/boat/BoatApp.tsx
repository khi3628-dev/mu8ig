"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import { FISH, type PlayerStats, type RacePerks, type RaceResult } from "@/lib/boat/race";
import { formatTime, type GhostRun } from "@/lib/boat/ghost";
import { applyBestRun, applyRaceReward, loadSave, playerStats, racePerks, type Save } from "@/lib/boat/paradise";
import { ART, artBg } from "@/lib/boat/art";
import ParadiseView, { type BoardProps } from "./ParadiseView";
import RaceView from "./RaceView";

const SAVE_KEY = "yacht-paradise-save";

type Screen =
  | { kind: "title" }
  | { kind: "paradise" }
  | { kind: "race"; stats: PlayerStats; perks: RacePerks; ghost: GhostRun | null } // 출전 시점 기준으로 고정
  | { kind: "result"; result: RaceResult };

function readSave(): Save {
  try {
    return loadSave(localStorage.getItem(SAVE_KEY));
  } catch {
    return loadSave(null);
  }
}

function writeSave(s: Save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    // 저장소를 쓸 수 없는 환경(시크릿 모드 등)에선 이번 세션 동안만 유지
  }
}

export interface RaceScreenProps {
  stats: PlayerStats;
  perks: RacePerks;
  ghost: GhostRun | null;
  onFinish: (r: RaceResult) => void;
}

// Race·board를 바꿔 끼우면 같은 진행 상황으로 다른 화면(3D 등)을 쓸 수 있다
export default function BoatApp({
  Race = RaceView,
  board,
}: {
  Race?: ComponentType<RaceScreenProps>;
  board?: (props: BoardProps) => React.ReactNode;
}) {
  const [save, setSave] = useState<Save>(readSave);
  const [screen, setScreen] = useState<Screen>({ kind: "title" });

  useEffect(() => writeSave(save), [save]);

  const finishRace = useCallback((result: RaceResult) => {
    setSave((prev) => {
      const next = structuredClone(prev);
      applyRaceReward(next, result.rank, result.prize, result.fishCoins, result.caught.length);
      applyBestRun(next, result.run);
      return next;
    });
    setScreen({ kind: "result", result });
  }, []);

  return (
    <div className="h-screen w-full select-none overflow-hidden bg-gradient-to-b from-sky-600 to-sky-800">
      {screen.kind === "title" && <TitleView save={save} onStart={() => setScreen({ kind: "paradise" })} />}
      {screen.kind === "paradise" && (
        <ParadiseView
          save={save}
          onChange={setSave}
          onRace={() => setScreen({ kind: "race", stats: playerStats(save), perks: racePerks(save), ghost: save.bestRun })}
          board={board}
        />
      )}
      {screen.kind === "race" && <Race stats={screen.stats} perks={screen.perks} ghost={screen.ghost} onFinish={finishRace} />}
      {screen.kind === "result" && (
        <ResultView result={screen.result} onBack={() => setScreen({ kind: "paradise" })} />
      )}
    </div>
  );
}

function TitleView({ save, onStart }: { save: Save; onStart: () => void }) {
  return (
    <div className="relative flex h-full flex-col justify-end bg-cover bg-center" style={artBg(ART.title)}>
      <div className="absolute inset-0 bg-gradient-to-t from-sky-950/90 via-sky-950/30 to-transparent" />
      <div className="relative mx-auto w-full max-w-3xl space-y-4 p-6 pb-10 text-center text-white">
        <div className="text-xs uppercase tracking-[0.3em] text-amber-200">Jet Ski Racing · Yacht Paradise</div>
        <h1 className="text-4xl font-black drop-shadow-lg sm:text-6xl">요트 파라다이스 레이싱</h1>
        <p className="text-sm text-sky-100 sm:text-base">
          3분 레이스로 순위를 가리고, 낚시와 상금으로 나만의 요트 섬을 만든다.
        </p>
        <button
          onClick={onStart}
          className="-skew-x-12 bg-white px-12 py-3 text-lg font-black italic tracking-wide text-slate-950 shadow-xl transition hover:bg-amber-200"
        >
          <span className="inline-block skew-x-12">START · 게임 시작</span>
        </button>
        {save.races > 0 && (
          <div className="text-xs text-sky-200">
            CREDITS {save.money.toLocaleString()} · RACES {save.races} · BEST P{save.bestRank}
          </div>
        )}
      </div>
    </div>
  );
}

// 베스트 기록(고스트)과 비교한 이번 완주
function RecordLine({ result }: { result: RaceResult }) {
  if (!result.run) return null;
  const best = result.bestBefore;
  if (best === null) return <Tag tone="bg-sky-500">FIRST RECORD · 다음 레이스부터 이 기록과 함께 달린다</Tag>;
  if (result.run.time < best) {
    return <Tag tone="bg-emerald-500">NEW RECORD · {formatTime(best)} → {formatTime(result.run.time)}</Tag>;
  }
  return <Tag tone="bg-white/15">BEST +{(result.run.time - best).toFixed(1)}s</Tag>;
}

function Tag({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <div className={`mt-3 inline-block -skew-x-12 px-3 py-1 ${tone}`}>
      <div className="skew-x-12 text-xs font-black italic tracking-wide">{children}</div>
    </div>
  );
}

// 시설 효과로 붙은 보너스 표시
function BonusTag({ value }: { value: number }) {
  return <span className="ml-2 text-[11px] font-bold tracking-wide text-amber-300">ISLAND +{Math.round(value * 100)}%</span>;
}

const cr = (n: number) => `${n.toLocaleString()} CR`;

function ResultView({ result, onBack }: { result: RaceResult; onBack: () => void }) {
  const counts = new Map<number, number>();
  for (const i of result.caught) counts.set(i, (counts.get(i) ?? 0) + 1);
  const winnerTime = result.standings[0]?.time ?? null;
  const status = result.rank === 1 ? "WINNER" : result.finished ? "FINISHED" : "TIME OVER · 상금 50%";
  return (
    <div className="flex h-full items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-md bg-slate-950/95 pb-5 text-white shadow-2xl ring-1 ring-white/10">
        <div className="relative h-44 w-full bg-cover bg-top" style={artBg(result.rank <= 3 ? ART.podium : ART.ski)}>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
          <div className="absolute bottom-3 left-5 flex items-end gap-3">
            <div className="text-6xl font-black italic leading-none">P{result.rank}</div>
            <div className={`pb-1 text-xs font-black tracking-[0.25em] ${result.rank === 1 ? "text-amber-300" : "text-white/70"}`}>
              {status}
            </div>
          </div>
          <div className="absolute bottom-3 right-5 text-right">
            <div className="text-[10px] font-bold tracking-[0.3em] text-white/60">TIME</div>
            <div className="text-xl font-black italic tabular-nums">{formatTime(result.time)}</div>
          </div>
        </div>
        <div className="px-5">
          <RecordLine result={result} />
        </div>
        <ol className="mt-4 space-y-0.5 px-5 text-sm tabular-nums">
          {result.standings.map((s, i) => (
            <li
              key={s.name}
              className={`grid grid-cols-[2.5rem_1fr_auto] items-center px-3 py-1 ${
                s.isPlayer ? "-skew-x-12 bg-amber-300 font-black text-slate-950" : "text-white/85"
              }`}
            >
              <span className="italic">P{i + 1}</span>
              <span>{s.isPlayer ? "YOU" : s.name}</span>
              <span className="italic">
                {s.time === null ? "DNF" : i === 0 || winnerTime === null ? formatTime(s.time) : `+${(s.time - winnerTime).toFixed(1)}`}
              </span>
            </li>
          ))}
        </ol>
        <div className="mx-5 mt-4 space-y-1 border-t border-white/10 pt-3 text-sm tabular-nums">
          <div className="flex justify-between">
            <span className="text-white/70">
              PRIZE{result.perks.prize > 0 && <BonusTag value={result.perks.prize} />}
            </span>
            <span>{cr(result.prize)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">
              FISH{result.perks.fish > 0 && <BonusTag value={result.perks.fish} />}
              <span className="ml-2 text-xs text-white/50">
                {[...counts].map(([i, n]) => `${FISH[i].name} ${n}`).join(" · ") || "-"}
              </span>
            </span>
            <span>{cr(result.fishCoins)}</span>
          </div>
          <div className="flex justify-between pt-1 text-lg font-black italic">
            <span>TOTAL</span>
            <span className="text-amber-300">{cr(result.prize + result.fishCoins)}</span>
          </div>
        </div>
        <button
          onClick={onBack}
          className="mx-5 mt-4 w-[calc(100%-2.5rem)] -skew-x-12 bg-white py-3 font-black italic tracking-wide text-slate-950 hover:bg-amber-200"
        >
          <span className="inline-block skew-x-12">CONTINUE · 파라다이스로</span>
        </button>
      </div>
    </div>
  );
}
