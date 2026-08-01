import { describe, it, expect } from "vitest";
import { addDaysISO, daysBetween, nextStreak, todayISO } from "./streak";

const start = { current: 0, longest: 0, lastCompletedISODate: null };

describe("todayISO / addDaysISO", () => {
  it("adds days correctly", () => {
    expect(addDaysISO("2026-01-01", 1)).toBe("2026-01-02");
    expect(addDaysISO("2026-02-28", 1)).toBe("2026-03-01"); // 2026 not a leap year
    expect(addDaysISO("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("daysBetween returns integer days", () => {
    expect(daysBetween("2026-01-01", "2026-01-04")).toBe(3);
    expect(daysBetween("2026-01-04", "2026-01-01")).toBe(-3);
  });
});

describe("nextStreak", () => {
  it("first ever completion sets current=1 and longest=1", () => {
    const r = nextStreak(start, "2026-01-01");
    expect(r.current).toBe(1);
    expect(r.longest).toBe(1);
    expect(r.lastCompletedISODate).toBe("2026-01-01");
  });

  it("same-day completion does not change state", () => {
    const prev = { current: 3, longest: 5, lastCompletedISODate: "2026-01-01" };
    const r = nextStreak(prev, "2026-01-01");
    expect(r).toEqual(prev);
  });

  it("consecutive day increments current and updates longest when needed", () => {
    const prev = { current: 3, longest: 3, lastCompletedISODate: "2026-01-01" };
    const r = nextStreak(prev, "2026-01-02");
    expect(r.current).toBe(4);
    expect(r.longest).toBe(4);
  });

  it("keeps longest if current stays below it", () => {
    const prev = { current: 2, longest: 10, lastCompletedISODate: "2026-01-01" };
    const r = nextStreak(prev, "2026-01-02");
    expect(r.current).toBe(3);
    expect(r.longest).toBe(10);
  });

  it("gap > 1 day resets to 1", () => {
    const prev = { current: 5, longest: 7, lastCompletedISODate: "2026-01-01" };
    const r = nextStreak(prev, "2026-01-05");
    expect(r.current).toBe(1);
    expect(r.longest).toBe(7);
  });

  it("todayISO returns a valid ISO date", () => {
    expect(todayISO(new Date("2026-02-03T10:00:00"))).toBe("2026-02-03");
  });
});
