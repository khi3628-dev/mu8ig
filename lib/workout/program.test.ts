import { describe, it, expect } from "vitest";
import { nextDayType, ROTATION, PROGRAM, isDayType } from "./program";

describe("nextDayType", () => {
  it("순서대로 로테이션을 돈다", () => {
    ROTATION.forEach((dayType, index) => {
      expect(nextDayType(index)).toBe(dayType);
    });
  });

  it("한 바퀴 돌면 처음으로 돌아온다", () => {
    expect(nextDayType(ROTATION.length)).toBe(ROTATION[0]);
    expect(nextDayType(ROTATION.length * 2 + 1)).toBe(ROTATION[1]);
  });
});

describe("PROGRAM", () => {
  it("ROTATION에 등장하는 모든 dayType에 대한 스펙이 있다", () => {
    for (const dayType of ROTATION) {
      expect(PROGRAM[dayType]).toBeDefined();
      expect(PROGRAM[dayType].exercises.length).toBeGreaterThan(0);
    }
  });
});

describe("isDayType", () => {
  it("유효한 값만 통과시킨다", () => {
    expect(isDayType("A1")).toBe(true);
    expect(isDayType("C1")).toBe(false);
  });
});
