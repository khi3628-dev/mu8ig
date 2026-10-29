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
          className="rounded-full bg-white px-10 py-3 text-lg font-black text-sky-900 shadow-xl transition hover:bg-amber-200"
        >
          게임 시작
        </button>
        {save.races > 0 && (
          <div className="text-xs text-sky-200">
            💰 {save.money.toLocaleString()} · 레이스 {save.races}회 · 최고 {save.bestRank}위
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
  const [text, tone] =
    best === null
      ? ["👻 첫 완주 기록 저장! 다음 레이스부터 고스트로 함께 달린다", "bg-sky-100 text-sky-800"]
      : result.run.time < best
        ? [`👻 신기록! ${formatTime(best)} → ${formatTime(result.run.time)}`, "bg-emerald-100 text-emerald-800"]
        : [`👻 베스트까지 +${(result.run.time - best).toFixed(1)}초`, "bg-slate-100 text-slate-700"];
  return <div className={`mt-2 rounded-lg px-3 py-1.5 text-sm font-bold ${tone}`}>{text}</div>;
}

// 시설 효과로 붙은 보너스 표시
function BonusTag({ value }: { value: number }) {
  return (
    <span className="ml-1 rounded bg-amber-100 px-1.5 text-[11px] font-bold text-amber-700">
      🏝️ +{Math.round(value * 100)}%
    </span>
  );
}

function ResultView({ result, onBack }: { result: RaceResult; onBack: () => void }) {
  const counts = new Map<number, number>();
  for (const i of result.caught) counts.set(i, (counts.get(i) ?? 0) + 1);
  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 overflow-hidden rounded-2xl bg-white pb-6 text-sky-950 shadow-2xl">
        <div className="relative h-44 w-full bg-cover bg-top" style={artBg(result.rank <= 3 ? ART.podium : ART.ski)}>
          {result.rank === 1 && (
            <div className="absolute bottom-2 left-3 rounded-full bg-amber-300 px-3 py-1 text-sm font-black text-sky-950">🏆 우승!</div>
          )}
        </div>
        <div className="px-6 text-center">
          <div className="text-sm text-sky-600">{result.finished ? "완주" : "시간 초과 · 상금 50%"}</div>
          <div className="text-5xl font-black">{result.rank}위</div>
          <div className="text-sm text-sky-600 tabular-nums">{result.time.toFixed(1)}초</div>
          <RecordLine result={result} />
        </div>
        <ol className="space-y-1 px-6 text-sm">
          {result.standings.map((s, i) => (
            <li
              key={s.name}
              className={`flex justify-between rounded px-3 py-1 ${s.isPlayer ? "bg-sky-100 font-bold" : ""}`}
            >
              <span>{i + 1}. {s.name}</span>
              <span className="tabular-nums">{s.time === null ? "미완주" : `${s.time.toFixed(1)}s`}</span>
            </li>
          ))}
        </ol>
        <div className="mx-6 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span>순위 상금{result.perks.prize > 0 && <BonusTag value={result.perks.prize} />}</span>
            <span className="tabular-nums">💰 {result.prize}</span>
          </div>
          <div className="flex justify-between">
            <span>
              낚시{result.perks.fish > 0 && <BonusTag value={result.perks.fish} />}{" "}
              {[...counts].map(([i, n]) => `${FISH[i].emoji}×${n}`).join(" ") || "-"}
            </span>
            <span className="tabular-nums">💰 {result.fishCoins}</span>
          </div>
          <div className="flex justify-between text-lg font-black">
            <span>합계</span><span className="tabular-nums">💰 {result.prize + result.fishCoins}</span>
          </div>
        </div>
        <button
          onClick={onBack}
          className="mx-6 w-[calc(100%-3rem)] rounded-xl bg-sky-700 py-3 font-bold text-white hover:bg-sky-800"
        >
          파라다이스로 돌아가기
        </button>
      </div>
    </div>
  );
}
