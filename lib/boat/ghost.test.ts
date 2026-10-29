import { describe, expect, it } from "vitest";
import { GHOST_DT, formatTime, ghostPose, type GhostRun } from "./ghost";
import { LAPS, createRace, raceResult, splitInfo, updateRace } from "./race";

const idle = { throttle: 0, steer: 0, fish: false };
const gas = { throttle: 1, steer: 0, fish: false };

describe("고스트 레이서", () => {
  it("출발 후 일정 간격으로 플레이어 주행을 기록한다", () => {
    const s = createRace(() => 0.5);
    updateRace(s, 3, idle); // 카운트다운이 끝나는 순간
    for (let i = 0; i < 40; i++) updateRace(s, 0.05, gas); // 2초
    const frames = s.recording.points.length / 3;
    expect(frames).toBeGreaterThanOrEqual(2 / GHOST_DT);
    expect(frames).toBeLessThanOrEqual(2 / GHOST_DT + 2);
    // 앞으로 나아간 기록이 남는다
    const p = s.recording.points;
    expect(Math.hypot(p[p.length - 3] - p[0], p[p.length - 2] - p[1])).toBeGreaterThan(10);
  });

  it("카운트다운 중에는 기록하지 않는다", () => {
    const s = createRace(() => 0.5);
    updateRace(s, 1, idle);
    expect(s.recording.points).toEqual([]);
  });

  it("체크포인트를 지날 때 구간 시간을 남기고, 베스트와 비교한다", () => {
    const ghost: GhostRun = { time: 100, dt: GHOST_DT, points: [0, 0, 0], splits: [10] };
    const s = createRace(() => 0.5, undefined, undefined, ghost);
    s.time = 7.95;
    const p = s.racers[0];
    p.x = s.course[1].x;
    p.y = s.course[1].y;
    updateRace(s, 0.05, idle);
    expect(s.recording.splits).toEqual([8]);
    expect(splitInfo(s)).toEqual({ delta: -2, at: 8 });
  });

  it("베스트 기록이 없으면 구간 비교도 없다", () => {
    const s = createRace(() => 0.5);
    s.recording.splits.push(5);
    expect(splitInfo(s)).toBeNull();
  });

  it("완주했을 때만 주행 기록을 결과로 돌려준다", () => {
    const s = createRace(() => 0.5, undefined, undefined, { time: 99, dt: GHOST_DT, points: [0, 0, 0], splits: [] });
    s.time = 0;
    updateRace(s, 0.05, gas);
    expect(raceResult(s).run).toBeNull();
    expect(raceResult(s).bestBefore).toBe(99);

    const p = s.racers[0];
    p.lap = LAPS - 1;
    p.next = 0;
    p.x = s.course[0].x;
    p.y = s.course[0].y;
    updateRace(s, 0.05, idle);
    const run = raceResult(s).run!;
    expect(run.time).toBeCloseTo(p.finishTime!, 2);
    expect(run.points.length).toBeGreaterThan(0);
    expect(run.splits.length).toBe(1);
  });

  it("기록 사이를 보간해 재생하고, 끝난 뒤에는 결승점에 머문다", () => {
    const g: GhostRun = { time: 1, dt: 1, points: [0, 0, 0, 10, 20, 1], splits: [] };
    expect(ghostPose(g, 0.5)).toEqual({ x: 5, y: 10, heading: 0.5 });
    expect(ghostPose(g, 99)).toEqual({ x: 10, y: 20, heading: 1 });
    expect(ghostPose(g, -1)).toEqual({ x: 0, y: 0, heading: 0 });
  });

  it("시간 표시", () => {
    expect(formatTime(92.44)).toBe("1:32.4");
    expect(formatTime(5)).toBe("0:05.0");
  });
});
