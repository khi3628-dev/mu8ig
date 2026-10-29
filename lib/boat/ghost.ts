// 고스트 레이서: 플레이어의 주행을 일정 간격으로 기록하고, 다음 레이스에서 그대로 재생한다.
// 기록은 저장 데이터에 들어가므로 좌표를 반올림해 작게 유지한다.

export const GHOST_DT = 0.2; // 기록 간격 (초)

export interface GhostRun {
  time: number; // 완주 시간
  dt: number;
  points: number[]; // [x, y, heading] 반복
  splits: number[]; // 체크포인트를 지난 시각 (통과 순서대로)
}

export interface Recording {
  points: number[];
  splits: number[];
}

export const createRecording = (): Recording => ({ points: [], splits: [] });

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

// 시각 t까지 밀린 샘플을 채운다 (프레임이 느려도 간격이 일정하게 유지된다)
export function recordSample(rec: Recording, t: number, x: number, y: number, heading: number) {
  while ((rec.points.length / 3) * GHOST_DT <= t) rec.points.push(r1(x), r1(y), r2(heading));
}

export function recordSplit(rec: Recording, t: number) {
  rec.splits.push(r2(t));
}

export function ghostPose(g: GhostRun, t: number) {
  const frames = g.points.length / 3;
  const f = Math.min(Math.max(t / g.dt, 0), frames - 1);
  const i = Math.floor(f);
  const j = Math.min(i + 1, frames - 1);
  const k = f - i;
  const p = g.points;
  const dh = Math.atan2(Math.sin(p[j * 3 + 2] - p[i * 3 + 2]), Math.cos(p[j * 3 + 2] - p[i * 3 + 2]));
  return {
    x: p[i * 3] + (p[j * 3] - p[i * 3]) * k,
    y: p[i * 3 + 1] + (p[j * 3 + 1] - p[i * 3 + 1]) * k,
    heading: p[i * 3 + 2] + dh * k,
  };
}

export function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  return `${m}:${(sec - m * 60).toFixed(1).padStart(4, "0")}`;
}
