"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { FISH, type PlayerStats, type RacePerks, type RaceResult } from "@/lib/boat/race";
import { formatTime, type GhostRun } from "@/lib/boat/ghost";
import { applyBestRun, applyRaceReward, loadSave, playerStats, racePerks, type Save } from "@/lib/boat/paradise";
import { ART, artBg } from "@/lib/boat/art";
import ParadiseView, { type BoardProps } from "./ParadiseView";
import RaceView from "./RaceView";
import { music } from "./music";
import MetaPanel, { DailyModal } from "./MetaPanel";
import { getPlatform, onAdAudio, type Platform } from "./platform";
import {
  claimDaily, dailyAvailable, interstitialDue, loadMeta, localDay, markInterstitial, missionDef, recordRace, refreshMissions,
  type MetaSave, type MissionKind,
} from "@/lib/boat/meta";

const SAVE_KEY = "yacht-paradise-save";
const META_KEY = "yacht-paradise-meta";

type Screen =
  | { kind: "title" }
  | { kind: "paradise" }
  | { kind: "race"; stats: PlayerStats; perks: RacePerks; ghost: GhostRun | null } // 출전 시점 기준으로 고정
  | { kind: "result"; result: RaceResult; missions: MissionKind[] }; // missions: 이번 레이스로 달성한 미션

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

function readMeta(): MetaSave {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(META_KEY);
  } catch {
    // 위와 같음
  }
  const m = loadMeta(raw);
  refreshMissions(m, localDay());
  return m;
}

function writeMeta(m: MetaSave) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    // 위와 같음
  }
}

export interface RaceScreenProps {
  stats: PlayerStats;
  perks: RacePerks;
  ghost: GhostRun | null;
  skin: string; // 내 제트스키·슈트 스킨 (meta.ts SKINS)
  sfx: number; // 효과음 음량 0..1
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
  const [meta, setMeta] = useState<MetaSave>(readMeta);
  const [screen, setScreen] = useState<Screen>({ kind: "title" });
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [today, setToday] = useState(localDay);
  const metaRef = useRef(meta);

  useEffect(() => writeSave(save), [save]);
  useEffect(() => {
    metaRef.current = meta;
    writeMeta(meta);
  }, [meta]);
  useEffect(() => music.setVolume(meta.settings.music), [meta.settings.music]);

  // 광고 플랫폼 준비. 광고가 도는 동안 음악을 멈춘다
  useEffect(() => {
    onAdAudio((paused) => music.setPaused(paused));
    getPlatform().then(setPlatform);
  }, []);

  // 파라다이스로 갈 때마다 날짜 확인: 자정이 지났으면 새 미션·접속 보상
  const goParadise = () => {
    const d = localDay();
    setToday(d);
    if (metaRef.current.missionDay !== d) {
      const next = structuredClone(metaRef.current);
      refreshMissions(next, d);
      setMeta(next);
    }
    setScreen({ kind: "paradise" });
  };

  // 레이스 중에만 "게임 중" (포털 SDK가 이 구간에는 광고를 띄우지 않는다)
  useEffect(() => {
    if (screen.kind !== "race" || !platform) return;
    platform.gameplayStart();
    return () => platform.gameplayStop();
  }, [screen.kind, platform]);

  const addMoney = useCallback((delta: number) => {
    setSave((prev) => ({ ...structuredClone(prev), money: prev.money + delta }));
  }, []);

  // 화면별 배경음악 (레이스 중 마지막 랩 곡은 레이스 화면이 바꾼다). 우승 징글이 아직 없어 1위는 타이틀 곡
  const resultRank = screen.kind === "result" ? screen.result.rank : 0;
  useEffect(() => {
    if (screen.kind === "result") music.play(resultRank === 1 ? "title" : "lose");
    else music.play(screen.kind);
  }, [screen.kind, resultRank]);
  useEffect(() => () => music.play(null), []);

  const finishRace = useCallback((result: RaceResult) => {
    setSave((prev) => {
      const next = structuredClone(prev);
      applyRaceReward(next, result.rank, result.prize, result.fishCoins, result.caught.length);
      applyBestRun(next, result.run);
      return next;
    });
    const nextMeta = structuredClone(metaRef.current);
    const missions = recordRace(nextMeta, result, localDay());
    nextMeta.tutorialDone = true;
    setMeta(nextMeta);
    setScreen({ kind: "result", result, missions });
  }, []);

  // 결과 화면 → 파라다이스. 쉬는 시점이라 이때만 전면 광고를 띄운다 (서포터·처음 몇 판 제외)
  const leaveResult = async () => {
    if (platform && interstitialDue(meta)) {
      const next = structuredClone(meta);
      markInterstitial(next);
      setMeta(next);
      await platform.interstitial();
    }
    goParadise();
  };

  const claimDailyReward = async (bonusAd: boolean) => {
    const next = structuredClone(meta);
    const amount = claimDaily(next, today);
    const doubled = bonusAd && platform ? await platform.rewarded() : false;
    setMeta(next);
    addMoney(doubled ? amount * 2 : amount);
  };

  return (
    <div className="relative h-screen w-full select-none overflow-hidden bg-gradient-to-b from-sky-600 to-sky-800">
      {screen.kind === "title" && <TitleView save={save} onStart={goParadise} />}
      {screen.kind === "paradise" && (
        <ParadiseView
          save={save}
          onChange={setSave}
          onRace={() => setScreen({ kind: "race", stats: playerStats(save), perks: racePerks(save), ghost: save.bestRun })}
          board={board}
          side={<MetaPanel meta={meta} money={save.money} platform={platform} onMeta={setMeta} onMoney={addMoney} />}
        />
      )}
      {screen.kind === "paradise" && dailyAvailable(meta, today) && (
        <DailyModal meta={meta} today={today} platform={platform} onClaim={claimDailyReward} />
      )}
      {screen.kind === "race" && (
        <>
          <Race
            stats={screen.stats}
            perks={screen.perks}
            ghost={screen.ghost}
            skin={meta.skin}
            sfx={meta.settings.sfx}
            onFinish={finishRace}
          />
          {!meta.tutorialDone && <Tutorial />}
        </>
      )}
      {screen.kind === "result" && (
        <ResultView
          result={screen.result}
          missions={screen.missions}
          platform={platform}
          onDouble={() => addMoney(screen.result.prize + screen.result.fishCoins)}
          onBack={leaveResult}
        />
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
        <a href="/boat/privacy" className="block text-[11px] text-sky-300/80 underline">개인정보처리방침</a>
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

// 첫 레이스에만 잠깐 띄우는 조작 안내
function Tutorial() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 9000);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[38%] z-20 flex justify-center px-4">
      <div className="max-w-md rounded-md bg-slate-950/85 px-5 py-4 text-center text-sm leading-6 text-white shadow-2xl ring-1 ring-white/10">
        <div className="mb-1 text-[11px] font-black tracking-[0.3em] text-amber-300">HOW TO RACE</div>
        <b>W/↑</b> 가속 · <b>S/↓</b> 감속 · <b>A D/← →</b> 조향
        <br />
        노란 게이트를 순서대로 지나 3바퀴. 뛰어오르는 물고기 근처에서 <b>SPACE</b>로 낚시
        <br />
        <span className="text-white/60">모바일은 화면 버튼 · 3D는 V키로 1인칭</span>
      </div>
    </div>
  );
}

function ResultView({
  result,
  missions,
  platform,
  onDouble,
  onBack,
}: {
  result: RaceResult;
  missions: MissionKind[];
  platform: Platform | null;
  onDouble: () => void;
  onBack: () => void | Promise<void>;
}) {
  const [doubled, setDoubled] = useState(false);
  const [busy, setBusy] = useState(false);
  const total = result.prize + result.fishCoins;
  const watchForDouble = async () => {
    if (!platform || busy) return;
    setBusy(true);
    const ok = await platform.rewarded();
    setBusy(false);
    if (ok) {
      setDoubled(true);
      onDouble();
    }
  };
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
            <span className="text-amber-300">{cr(doubled ? total * 2 : total)}</span>
          </div>
          {doubled && <div className="text-right text-xs font-bold text-amber-200">광고 보상 2배 적용</div>}
        </div>
        {missions.length > 0 && (
          <div className="mx-5 mt-3 rounded bg-amber-300/15 px-3 py-2 text-xs text-amber-100">
            미션 달성: {missions.map((k) => missionDef(k).text).join(" · ")} — 파라다이스에서 보상 받기
          </div>
        )}
        {platform?.rewardedAvailable && total > 0 && !doubled && (
          <button
            onClick={watchForDouble}
            disabled={busy}
            className="mx-5 mt-4 w-[calc(100%-2.5rem)] -skew-x-12 bg-amber-300 py-3 font-black italic tracking-wide text-slate-950 hover:bg-amber-200 disabled:opacity-50"
          >
            <span className="inline-block skew-x-12">광고 보고 상금 2배 · +{cr(total)}</span>
          </button>
        )}
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
