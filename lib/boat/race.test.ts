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

  describe("기어 R (후진)", () => {
    const rev = { throttle: 1, steer: 0, fish: false, reverse: true };

    it("멈춘 상태에서 R로 가속하면 뒤로 가고, 최고 후진 속도를 넘지 않는다", () => {
      const s = createRace(() => 0.5);
      s.time = 0;
      const p = s.racers[0];
      const start = { x: p.x, y: p.y };
      for (let i = 0; i < 100; i++) updateRace(s, 0.05, rev);
      expect(p.speed).toBeLessThan(0);
      expect(p.speed).toBeGreaterThanOrEqual(-7);
      // 진행 방향의 반대쪽으로 움직였다
      const moved = (p.x - start.x) * Math.cos(p.heading) + (p.y - start.y) * Math.sin(p.heading);
      expect(moved).toBeLessThan(-10);
    });

    it("앞으로 달리던 중에 R로 바꾸면 먼저 멈춘 뒤 후진한다", () => {
      const s = createRace(() => 0.5);
      s.time = 0;
      s.boostPads = [];
      const p = s.racers[0];
      p.speed = 20;
      updateRace(s, 0.05, rev);
      expect(p.speed).toBeGreaterThan(0);
      expect(p.speed).toBeLessThan(20);
      for (let i = 0; i < 40; i++) updateRace(s, 0.05, rev);
      expect(p.speed).toBeLessThan(0);
    });

    it("후진 중 브레이크·관성은 0을 넘어 튀지 않고 서서히 멈춘다", () => {
      const s = createRace(() => 0.5);
      s.time = 0;
      const p = s.racers[0];
      p.speed = -6;
      updateRace(s, 0.05, idle);
      expect(p.speed).toBeLessThan(0);
      expect(p.speed).toBeGreaterThan(-6);
      updateRace(s, 0.05, { ...idle, throttle: -1 });
      expect(p.speed).toBeLessThanOrEqual(0);
    });

    it("기어 D(기본)는 기존 동작 그대로 앞으로 간다", () => {
      const s = createRace(() => 0.5);
      s.time = 0;
      for (let i = 0; i < 20; i++) updateRace(s, 0.05, { ...rev, reverse: false });
      expect(s.racers[0].speed).toBeGreaterThan(0);
    });
  });

  describe("몸싸움과 접전", () => {
    it("제트스키끼리 겹치면 밀려나고, 부딪히는 순간 한 번만 감속·집계한다", () => {
      const s = createRace(() => 0.5);
      s.time = 0;
      const [p, ai] = s.racers;
      ai.x = p.x + 1;
      ai.y = p.y;
      p.speed = 20;
      ai.speed = 20;
      updateRace(s, 0.01, idle);
      expect(Math.hypot(ai.x - p.x, ai.y - p.y)).toBeGreaterThanOrEqual(3.1);
      expect(s.contacts).toBe(1);
      const after = p.speed;
      expect(after).toBeLessThan(20);
      // 붙어 있는 동안 계속 깎이지 않는다
      ai.x = p.x + 3;
      ai.y = p.y;
      updateRace(s, 0.01, idle);
      expect(s.contacts).toBe(1);
    });

    it("플레이어보다 뒤처진 AI는 빨라지고, 앞선 AI는 늦춰진다", () => {
      const run = (playerLap: number) => {
        const s = createRace(() => 0.5);
        s.time = 0;
        s.boostPads = [];
        const p = s.racers[0];
        p.lap = playerLap;
        p.x = 9999; // 충돌·체크포인트에 끼지 않게 멀리
        for (let i = 0; i < 200; i++) updateRace(s, 0.05, idle);
        return s.racers[1].speed;
      };
      const behind = run(2); // 플레이어가 두 바퀴 앞섬 → AI가 뒤처짐
      const ahead = run(0);
      expect(behind).toBeGreaterThan(27);
      expect(behind).toBeGreaterThan(ahead);
    });

    it("같은 줄에서 출발해도 AI끼리 들이받지 않고 비켜 추월한다", () => {
      const s = createRace(() => 0.5); // 모든 AI가 같은 차선
      for (let i = 0; i < (COUNTDOWN + TIME_LIMIT) * 20 && !s.done; i++) updateRace(s, 0.05, idle, () => 0.5);
      const ai = s.racers.slice(1);
      const times = ai.map((r) => r.finishTime!);
      expect([...times].sort((a, b) => a - b)).toEqual(times);
    });
  });
});
