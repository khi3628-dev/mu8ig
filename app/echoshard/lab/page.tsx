'use client';

// 배치 시뮬레이션 실험실
//
// 사람 10명을 모으지 않고 GDD 1.6 성공 기준과 4.9 밸런스 경보선을 검증하는 화면.
// 봇 대 봇 경기를 브라우저에서 그대로 돌린다(시뮬레이션 코어가 렌더러와 완전히 분리돼 있어 가능하다).
//
// 접힘 켜기/끄기 A/B 비교가 이 화면의 핵심이다.
// 문서의 유일한 오리지널 규칙이 실제로 경기를 바꾸는지 숫자로 답하기 위해서다.

import { useState } from 'react';
import { runMatch, summarize, verdict, type BatchSummary } from '@/lib/echoshard/headless';
import type { MatchStats } from '@/lib/echoshard/types';

const mm = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function LabPage() {
  const [count, setCount] = useState(10);
  const [foldEnabled, setFoldEnabled] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [compare, setCompare] = useState<{ on: BatchSummary; off: BatchSummary } | null>(null);

  // 브라우저 UI가 멈추지 않도록 한 경기씩 끊어서 돌린다
  const runSet = async (n: number, fold: boolean, offset: number, total: number): Promise<BatchSummary> => {
    const results: MatchStats[] = [];
    for (let i = 0; i < n; i++) {
      results.push(runMatch({ seed: 1 + i * 7919, foldEnabled: fold }));
      setProgress(Math.round(((offset + i + 1) / total) * 100));
      await new Promise((r) => setTimeout(r, 0));
    }
    return summarize(results);
  };

  const run = async () => {
    setRunning(true);
    setSummary(null);
    setCompare(null);
    setProgress(0);
    const s = await runSet(count, foldEnabled, 0, count);
    setSummary(s);
    setRunning(false);
  };

  const runCompare = async () => {
    setRunning(true);
    setSummary(null);
    setCompare(null);
    setProgress(0);
    const on = await runSet(count, true, 0, count * 2);
    const off = await runSet(count, false, count, count * 2);
    setCompare({ on, off });
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-[#080b12] p-6 text-[#e8edf7]">
      <div className="mx-auto max-w-3xl">
        <a href="/echoshard" className="text-xs text-[#8b97ad] hover:text-white">
          ← 프로토타입으로
        </a>
        <h1 className="mt-2 text-2xl font-semibold">배치 시뮬레이션 실험실</h1>
        <p className="mt-2 text-sm text-[#8b97ad]">
          봇 대 봇 경기를 반복 실행해 경기 길이·진영 승률·역전률을 문서 기준과 대조합니다. 사람 10명이 필요 없는 유일한 검증 경로입니다.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <label className="text-sm">
            경기 수
            <input
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
              className="ml-2 w-20 rounded border border-white/15 bg-black/40 px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={foldEnabled} onChange={(e) => setFoldEnabled(e.target.checked)} />
            8:00 세계 접힘 사용
          </label>
          <button onClick={run} disabled={running} className="rounded-lg bg-[#4da3ff] px-4 py-2 text-sm font-semibold text-black disabled:opacity-40">
            실행
          </button>
          <button onClick={runCompare} disabled={running} className="rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-40">
            접힘 켬 / 끔 비교
          </button>
        </div>

        {running && (
          <div className="mt-4">
            <div className="h-2 w-full rounded bg-white/10">
              <div className="h-2 rounded bg-[#4da3ff] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-[#8b97ad]">{progress}% — 한 경기당 수 초 걸립니다</p>
          </div>
        )}

        {summary && <SummaryCard title={`결과 (접힘 ${foldEnabled ? '켬' : '끔'})`} s={summary} showVerdict />}

        {compare && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-[#ffd166]">세계 접힘 A/B 비교</h2>
            <p className="mt-1 text-xs text-[#8b97ad]">
              같은 시드 집합으로 접힘만 켜고 끄고 비교합니다. 차이가 없다면 접힘은 아직 게임을 바꾸지 않는 장식입니다.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <SummaryCard title="접힘 켬" s={compare.on} />
              <SummaryCard title="접힘 끔" s={compare.off} />
            </div>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
              <div>
                경기 길이 P50 차이: <b>{mm(compare.on.p50)}</b> vs <b>{mm(compare.off.p50)}</b> (
                {(compare.on.p50 - compare.off.p50 >= 0 ? '+' : '') + Math.round(compare.on.p50 - compare.off.p50)}초)
              </div>
              <div className="mt-1">
                역전률: <b>{(compare.on.comebackRate * 100).toFixed(1)}%</b> vs <b>{(compare.off.comebackRate * 100).toFixed(1)}%</b>
              </div>
              <div className="mt-1">
                접힘 구역 교전(직후 60초): <b>{compare.on.fightsAfterFold}</b> vs <b>{compare.off.fightsAfterFold}</b>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, s, showVerdict }: { title: string; s: BatchSummary; showVerdict?: boolean }) {
  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm tabular-nums">
        <dt className="text-[#8b97ad]">경기 수</dt>
        <dd>{s.count}</dd>
        <dt className="text-[#8b97ad]">길이 P50</dt>
        <dd>{mm(s.p50)}</dd>
        <dt className="text-[#8b97ad]">길이 P90</dt>
        <dd>{mm(s.p90)}</dd>
        <dt className="text-[#8b97ad]">최소 / 최대</dt>
        <dd>
          {mm(s.min)} / {mm(s.max)}
        </dd>
        <dt className="text-[#8b97ad]">청 승률</dt>
        <dd>{(s.blueWinRate * 100).toFixed(1)}%</dd>
        <dt className="text-[#8b97ad]">8분 역전률</dt>
        <dd>{(s.comebackRate * 100).toFixed(1)}%</dd>
        <dt className="text-[#8b97ad]">13~15분 적중</dt>
        <dd>{(s.inTargetWindow * 100).toFixed(1)}%</dd>
      </dl>
      {showVerdict && (
        <ul className="mt-3 space-y-1 text-xs">
          {verdict(s).map((v) => (
            <li key={v.line} className={v.pass ? 'text-[#7fe0a8]' : 'text-[#ff9d9d]'}>
              {v.pass ? '통과' : '미달'} · {v.line}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
