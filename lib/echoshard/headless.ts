// 배치 시뮬레이션 — "15분 경기감" 가설의 측정 도구
//
// 이 프로토타입의 존재 이유. GDD 1.6 성공 기준과 12.5 Go/No-Go는 다음을 요구한다:
//   - 실전 경기 길이 P50 13~15분, P90 ≤ 19분
//   - 동일 MMR 솔로 기준 진영별 승률 49~51%
//   - 8분 골드 -10% 팀의 승률 15% 이상 (GDD 4.9 경보선)
// 사람 10명 없이 이 세 가지를 검증할 수 있는 유일한 방법이 봇 대 봇 대량 시뮬레이션이다.
//
// foldEnabled 플래그로 접힘 유무를 A/B 비교하면, 문서의 유일한 오리지널 규칙이
// 실제로 경기 길이와 교전 위치를 바꾸는지 숫자로 확인할 수 있다.

import { TIMETABLE } from './config';
import { World, type WorldOptions } from './sim';
import type { MatchStats, Team } from './types';

const MAX_TICKS = 20 * 60 * 45; // 45분 안전 상한

export function runMatch(options: Partial<WorldOptions>): MatchStats {
  const world = new World({ ...options, playerHero: null });
  let ticks = 0;
  while (!world.over && ticks < MAX_TICKS) {
    world.step();
    ticks++;
  }
  return world.stats();
}

export interface BatchSummary {
  count: number;
  /** 초 단위 */
  p50: number;
  p90: number;
  mean: number;
  min: number;
  max: number;
  blueWinRate: number;
  drawRate: number;
  /** 8분 시점 열세 팀이 이긴 비율 */
  comebackRate: number;
  /** 8분 골드차 절댓값 평균 */
  meanGoldGapAt8: number;
  /** 접힘 구역 인근 교전: 접힘 직전 60초 vs 직후 60초 */
  fightsBeforeFold: number;
  fightsAfterFold: number;
  /** 목표 구간(13~15분) 안에 든 비율 */
  inTargetWindow: number;
  /** P90 ≤ 19분 통과 여부 */
  passesP90: boolean;
  endReasons: Record<string, number>;
  raw: MatchStats[];
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function summarize(results: MatchStats[]): BatchSummary {
  const durations = results.map((r) => r.durationSec).sort((a, b) => a - b);
  const blueWins = results.filter((r) => r.winner === 0).length;
  const draws = results.filter((r) => r.winner === null).length;
  const decided = results.filter((r) => r.winner !== null);
  const comebacks = results.filter((r) => r.comeback).length;
  const withLeader = results.filter((r) => r.winner !== null && r.goldDiffAt8 !== 0).length;
  const endReasons: Record<string, number> = {};
  for (const r of results) endReasons[r.endReason] = (endReasons[r.endReason] ?? 0) + 1;

  const p50 = percentile(durations, 50);
  const p90 = percentile(durations, 90);
  const inWindow = results.filter((r) => r.durationSec >= 13 * 60 && r.durationSec <= 15 * 60).length;

  return {
    count: results.length,
    p50,
    p90,
    mean: durations.reduce((a, b) => a + b, 0) / (durations.length || 1),
    min: durations[0] ?? 0,
    max: durations[durations.length - 1] ?? 0,
    blueWinRate: decided.length ? blueWins / decided.length : 0,
    drawRate: results.length ? draws / results.length : 0,
    comebackRate: withLeader ? comebacks / withLeader : 0,
    meanGoldGapAt8: results.reduce((a, r) => a + Math.abs(r.goldDiffAt8), 0) / (results.length || 1),
    fightsBeforeFold: results.reduce((a, r) => a + r.fightsBeforeFold, 0),
    fightsAfterFold: results.reduce((a, r) => a + r.fightsAfterFold, 0),
    inTargetWindow: results.length ? inWindow / results.length : 0,
    passesP90: p90 <= 19 * 60,
    endReasons,
    raw: results,
  };
}

export function runBatch(count: number, options: Partial<WorldOptions> = {}, onProgress?: (done: number, total: number) => void): BatchSummary {
  const results: MatchStats[] = [];
  for (let i = 0; i < count; i++) {
    results.push(runMatch({ ...options, seed: (options.seed ?? 1) + i * 7919 }));
    onProgress?.(i + 1, count);
  }
  return summarize(results);
}

/** 문서 기준과 대조한 판정문 */
export function verdict(s: BatchSummary): { line: string; pass: boolean }[] {
  const mm = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  const blue = s.blueWinRate * 100;
  return [
    {
      line: `경기 길이 P50 ${mm(s.p50)} (문서 목표 13:00~15:00)`,
      pass: s.p50 >= 13 * 60 && s.p50 <= 15 * 60,
    },
    {
      line: `경기 길이 P90 ${mm(s.p90)} (문서 목표 ≤ 19:00)`,
      pass: s.passesP90,
    },
    {
      line: `진영 승률 청 ${blue.toFixed(1)}% (문서 목표 49~51%)`,
      pass: blue >= 49 && blue <= 51,
    },
    {
      line: `8분 열세팀 역전률 ${(s.comebackRate * 100).toFixed(1)}% (문서 경보선: 15% 미만이면 접힘·현상금 재검토)`,
      pass: s.comebackRate >= 0.15,
    },
    {
      line: `접힘 구역 교전 ${s.fightsBeforeFold} → ${s.fightsAfterFold} (접힘 직전 60초 대비 직후 60초)`,
      pass: s.fightsAfterFold > s.fightsBeforeFold,
    },
  ];
}

export { TIMETABLE };
export type { Team };
