import { describe, it, expect } from "vitest";
import {
  nextDayType,
  ROTATION,
  PROGRAM,
  isDayType,
  buildProgram,
  progressedOneRm,
  cyclesCompletedFor,
  BASE_ONE_RM_KG,
} from "./program";

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

describe("cyclesCompletedFor", () => {
  it("6세션마다 한 바퀴로 센다", () => {
    expect(cyclesCompletedFor(0)).toBe(0);
    expect(cyclesCompletedFor(5)).toBe(0);
    expect(cyclesCompletedFor(6)).toBe(1);
    expect(cyclesCompletedFor(11)).toBe(1);
    expect(cyclesCompletedFor(12)).toBe(2);
  });
});

describe("progressedOneRm", () => {
  it("0바퀴째는 시작 1RM 그대로다", () => {
    expect(progressedOneRm(BASE_ONE_RM_KG.squat, 0)).toBe(BASE_ONE_RM_KG.squat);
  });

  it("바퀴가 늘수록 단조 증가한다", () => {
    const cycle1 = progressedOneRm(BASE_ONE_RM_KG.squat, 1);
    const cycle2 = progressedOneRm(BASE_ONE_RM_KG.squat, 2);
    expect(cycle1).toBeGreaterThan(BASE_ONE_RM_KG.squat);
    expect(cycle2).toBeGreaterThan(cycle1);
  });

  it("2.5kg 단위로 반올림한다", () => {
    expect(progressedOneRm(BASE_ONE_RM_KG.squat, 3) % 2.5).toBe(0);
  });
});

describe("buildProgram", () => {
  it("사이클이 늘수록 A1 스쿼트 무게도 늘어난다", () => {
    const week0 = buildProgram(0).A1.exercises.find((e) => e.name === "스쿼트");
    const week4 = buildProgram(4).A1.exercises.find((e) => e.name === "스쿼트");
    expect(week4!.weightKg).toBeGreaterThan(week0!.weightKg!);
  });
});
