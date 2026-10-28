import { describe, expect, it } from "vitest";
import {
  BASE_STATS, CATCH_RADIUS, COUNTDOWN, FISH, LAPS, NO_PERKS, RANK_PRIZE, TIME_LIMIT, createRace, raceResult,
  standings, legendCatchActive, updateRace,
} from "./race";

const idle = { throttle: 0, steer: 0, fish: false };

describe("water ski race", () => {
  it("카운트다운 동안은 움직이지 않는다", () => {
    const s = createRace(() => 0.5);
    const { x, y } = s.racers[1];
    for (let i = 0; i < 20; i++) updateRace(s, 0.1, { ...idle, throttle: 1 });
    expect(s.time).toBeLessThan(0);
    expect(s.racers[1].x).toBe(x);
    expect(s.racers[1].y).toBe(y);
  });

  it("AI는 3바퀴를 3분 안에 완주하고 빠른 순서대로 들어온다", () => {
    const s = createRace(() => 0.5);
    for (let i = 0; i < (COUNTDOWN + TIME_LIMIT) * 20 && !s.done; i++) updateRace(s, 0.05, idle, () => 0.5);
    const ai = s.racers.slice(1);
    for (const r of ai) {
      expect(r.lap).toBe(LAPS);
      expect(r.finishTime).not.toBeNull();
      expect(r.finishTime!).toBeLessThan(TIME_LIMIT);
    }
    // 최고 속도가 높은 AI가 먼저 들어온다
    const times = ai.map((r) => r.finishTime!);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("시간 초과 시 미완주 플레이어는 꼴찌, 상금 절반", () => {
    const s = createRace(() => 0.5);
    for (let i = 0; i < (COUNTDOWN + TIME_LIMIT) * 20 + 5 && !s.done; i++) updateRace(s, 0.05, idle, () => 0.5);
    expect(s.done).toBe(true);
    const r = raceResult(s);
    expect(r.finished).toBe(false);
    expect(r.rank).toBe(6);
    expect(r.prize).toBe(RANK_PRIZE[5] / 2);
  });

  it("플레이어가 완주하면 즉시 끝나고 순위대로 상금을 받는다", () => {
    const s = createRace(() => 0.5);
    s.time = 0;
    const p = s.racers[0];
    p.lap = LAPS - 1;
    p.next = 0;
    p.x = s.course[0].x;
    p.y = s.course[0].y;
    updateRace(s, 0.01, idle);
    expect(s.done).toBe(true);
    expect(standings(s)[0]).toBe(p);
    expect(raceResult(s)).toMatchObject({ rank: 1, finished: true, prize: RANK_PRIZE[0] });
  });

  it("근처에서 뛰어오른 물고기를 낚으면 코인을 얻고 잠깐 감속한다", () => {
    const s = createRace(() => 0.5);
    s.time = 0;
    s.fishTimer = 999;
    const p = s.racers[0];
    s.fish.push({ id: 1, species: 3, x: p.x + 3, y: p.y, life: 1, maxLife: 1 });
    updateRace(s, 0.01, { ...idle, fish: true });
    expect(s.caught).toEqual([3]);
    expect(p.slow).toBeGreaterThan(0);
    expect(raceResult(s).fishCoins).toBe(FISH[3].value);
  });

  it("멀리 있는 물고기는 낚을 수 없다", () => {
    const s = createRace(() => 0.5);
    s.time = 0;
    s.fishTimer = 999;
    const p = s.racers[0];
    s.fish.push({ id: 1, species: 0, x: p.x + 30, y: p.y, life: 1, maxLife: 1 });
    updateRace(s, 0.01, { ...idle, fish: true });
    expect(s.caught).toEqual([]);
    expect(s.fish).toHaveLength(1);
  });

  it("엔진 업그레이드는 플레이어 최고 속도를 올린다", () => {
    const run = (topSpeed: number) => {
      const s = createRace(() => 0.5, { ...BASE_STATS, topSpeed });
      s.time = 0;
      s.boostPads = [];
      for (let i = 0; i < 100; i++) updateRace(s, 0.05, { ...idle, throttle: 1 });
      return s.racers[0].speed;
    };
    expect(run(BASE_STATS.topSpeed + 6)).toBeGreaterThan(run(BASE_STATS.topSpeed));
  });

  it("그물 업그레이드는 낚시 범위를 넓힌다", () => {
    const s = createRace(() => 0.5, { ...BASE_STATS, catchRadius: CATCH_RADIUS + 10 });
    s.time = 0;
    s.fishTimer = 999;
    const p = s.racers[0];
    s.fish.push({ id: 1, species: 0, x: p.x + CATCH_RADIUS + 5, y: p.y, life: 1, maxLife: 1 });
    updateRace(s, 0.01, { ...idle, fish: true });
    expect(s.caught).toEqual([0]);
  });

  it("가장 희귀한 물고기를 낚으면 잠깐만 기념 컷 신호가 켜진다", () => {
    const s = createRace(() => 0.5);
    s.time = 0;
    s.fishTimer = 999;
    const p = s.racers[0];
    s.fish.push({ id: 1, species: FISH.length - 1, x: p.x + 2, y: p.y, life: 5, maxLife: 5 });
    expect(legendCatchActive(s)).toBe(false);
    updateRace(s, 0.01, { ...idle, fish: true });
    expect(legendCatchActive(s)).toBe(true);
    for (let i = 0; i < 60; i++) updateRace(s, 0.05, idle);
    expect(legendCatchActive(s)).toBe(false);
  });

  it("흔한 물고기는 기념 컷을 띄우지 않는다", () => {
    const s = createRace(() => 0.5);
    s.time = 0;
    s.fishTimer = 999;
    const p = s.racers[0];
    s.fish.push({ id: 1, species: 0, x: p.x + 2, y: p.y, life: 5, maxLife: 5 });
    updateRace(s, 0.01, { ...idle, fish: true });
    expect(s.caught).toEqual([0]);
    expect(legendCatchActive(s)).toBe(false);
  });

  describe("파라다이스 시설 효과", () => {
    it("상금·낚시 보너스가 결과에 반영된다", () => {
      const s = createRace(() => 0.5, BASE_STATS, { ...NO_PERKS, prize: 0.1, fish: 0.5 });
      s.time = 0;
      s.fishTimer = 999;
      const p = s.racers[0];
      s.fish.push({ id: 1, species: 3, x: p.x + 2, y: p.y, life: 5, maxLife: 5 });
      updateRace(s, 0.01, { ...idle, fish: true });
      p.lap = LAPS - 1;
      p.next = 0;
      p.x = s.course[0].x;
      p.y = s.course[0].y;
      updateRace(s, 0.01, idle);
      expect(raceResult(s)).toMatchObject({ rank: 1, prize: Math.round(RANK_PRIZE[0] * 1.1), fishCoins: 600 });
    });

    it("출발 대시: 카운트다운 동안은 서 있다가 GO와 동시에 그 속도로 출발한다", () => {
      const s = createRace(() => 0.5, BASE_STATS, { ...NO_PERKS, startSpeed: 12 });
      const start = { x: s.racers[0].x, y: s.racers[0].y };
      updateRace(s, COUNTDOWN - 0.05, idle);
      expect(s.racers[0]).toMatchObject(start);
      updateRace(s, 0.1, idle);
      expect(s.racers[0].speed).toBeGreaterThan(11);
      expect(Math.hypot(s.racers[0].x - start.x, s.racers[0].y - start.y)).toBeGreaterThan(0.5);
    });

    it("파도 부스트 지속시간이 늘어난다 (플레이어만)", () => {
      const run = (boost: number) => {
        const s = createRace(() => 0.5, BASE_STATS, { ...NO_PERKS, boost });
        s.time = 0;
        const p = s.racers[0];
        p.x = s.boostPads[0].x;
        p.y = s.boostPads[0].y;
        updateRace(s, 0.01, idle);
        return p.boost;
      };
      expect(run(0)).toBeCloseTo(1.5, 1);
      expect(run(1)).toBeCloseTo(3, 1);
    });
  });
});
