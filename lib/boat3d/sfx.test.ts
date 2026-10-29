import { describe, expect, it } from "vitest";
import { COUNTDOWN, FISH, LAPS, createRace, updateRace, type RaceInput } from "@/lib/boat/race";
import { sfxEvents, sfxSnapshot } from "./sfx";

const idle: RaceInput = { throttle: 0, steer: 0, fish: false };

function step(s: ReturnType<typeof createRace>, dt: number, input = idle) {
  const before = sfxSnapshot(s);
  updateRace(s, dt, input);
  return sfxEvents(before, sfxSnapshot(s)).map((e) => e.type);
}

describe("효과음 이벤트", () => {
  it("카운트다운 숫자가 바뀔 때마다 삐, 출발할 때 GO", () => {
    const s = createRace(() => 0.5);
    const types: string[] = [];
    for (let i = 0; i < (COUNTDOWN + 0.5) / 0.05; i++) types.push(...step(s, 0.05));
    expect(types.filter((t) => t === "tick")).toHaveLength(COUNTDOWN - 1); // 3은 시작할 때 이미 떠 있다
    expect(types.filter((t) => t === "go")).toHaveLength(1);
  });

  it("부스트 패드에 올라탈 때 한 번만", () => {
    const s = createRace(() => 0.5);
    s.time = 0;
    const p = s.racers[0];
    p.x = s.boostPads[0].x;
    p.y = s.boostPads[0].y;
    expect(step(s, 0.01)).toContain("boost");
    expect(step(s, 0.01)).not.toContain("boost");
  });

  it("낚기 성공·허탕, 황금 청새치는 특별 효과", () => {
    const s = createRace(() => 0.5);
    s.time = 0;
    s.fishTimer = 999;
    expect(step(s, 0.01, { ...idle, fish: true })).toEqual(["miss"]);
    const p = s.racers[0];
    s.fish.push({ id: 1, species: FISH.length - 1, x: p.x + 1, y: p.y, life: 5, maxLife: 5 });
    const before = sfxSnapshot(s);
    updateRace(s, 0.01, { ...idle, fish: true });
    expect(sfxEvents(before, sfxSnapshot(s))).toContainEqual({ type: "catch", legend: true });
  });

  it("게이트 통과, 바퀴 완료, 완주를 구분한다", () => {
    const s = createRace(() => 0.5);
    s.time = 0;
    const p = s.racers[0];
    p.x = s.course[1].x;
    p.y = s.course[1].y;
    expect(step(s, 0.01)).toContain("checkpoint");

    p.next = 0;
    p.x = s.course[0].x;
    p.y = s.course[0].y;
    expect(step(s, 0.01)).toContain("lap");

    p.lap = LAPS - 1;
    p.next = 0;
    expect(step(s, 0.01)).toContain("finish");
  });

  it("다른 제트스키와 부딪히는 순간 충돌음", () => {
    const s = createRace(() => 0.5);
    s.time = 0;
    const [p, ai] = s.racers;
    ai.x = p.x + 1;
    ai.y = p.y;
    expect(step(s, 0.01)).toContain("contact");
    expect(step(s, 0.01)).not.toContain("contact");
  });
});
