"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import { FISH, type PlayerStats, type RaceResult } from "@/lib/boat/race";
import { applyRaceReward, loadSave, playerStats, type Save } from "@/lib/boat/paradise";
import ParadiseView, { type BoardProps } from "./ParadiseView";
import RaceView from "./RaceView";

const SAVE_KEY = "yacht-paradise-save";

type Screen =
  | { kind: "paradise" }
  | { kind: "race"; stats: PlayerStats } // 출전 시점의 능력치로 고정
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
  const [screen, setScreen] = useState<Screen>({ kind: "paradise" });

  useEffect(() => writeSave(save), [save]);

  const finishRace = useCallback((result: RaceResult) => {
    setSave((prev) => {
      const next = structuredClone(prev);
      applyRaceReward(next, result.rank, result.prize, result.fishCoins, result.caught.length);
      return next;
    });
    setScreen({ kind: "result", result });
  }, []);

  return (
    <div className="h-screen w-full select-none overflow-hidden bg-gradient-to-b from-sky-600 to-sky-800">
      {screen.kind === "paradise" && (
        <ParadiseView
          save={save}
          onChange={setSave}
          onRace={() => setScreen({ kind: "race", stats: playerStats(save) })}
          board={board}
        />
      )}
      {screen.kind === "race" && <Race stats={screen.stats} onFinish={finishRace} />}
      {screen.kind === "result" && (
        <ResultView result={screen.result} onBack={() => setScreen({ kind: "paradise" })} />
      )}
    </div>
  );
}

function ResultView({ result, onBack }: { result: RaceResult; onBack: () => void }) {
  const counts = new Map<number, number>();
  for (const i of result.caught) counts.set(i, (counts.get(i) ?? 0) + 1);
  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 text-sky-950 shadow-2xl">
        <div className="text-center">
          <div className="text-sm text-sky-600">{result.finished ? "완주" : "시간 초과 · 상금 50%"}</div>
          <div className="text-5xl font-black">{result.rank}위</div>
          <div className="text-sm text-sky-600 tabular-nums">{result.time.toFixed(1)}초</div>
        </div>
        <ol className="space-y-1 text-sm">
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
        <div className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between"><span>순위 상금</span><span className="tabular-nums">💰 {result.prize}</span></div>
          <div className="flex justify-between">
            <span>
              낚시{" "}
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
          className="w-full rounded-xl bg-sky-700 py-3 font-bold text-white hover:bg-sky-800"
        >
          파라다이스로 돌아가기
        </button>
      </div>
    </div>
  );
}
