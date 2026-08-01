import { describe, it, expect } from "vitest";
import { bump, demote, initialEntry, isDue } from "./srs";

const DAY = 24 * 60 * 60 * 1000;

describe("srs", () => {
  it("initial entry is in box 1 and due now", () => {
    const now = 1_000_000_000;
    const e = initialEntry(now);
    expect(e.box).toBe(1);
    expect(isDue(e, now)).toBe(true);
  });

  it("bump promotes box and schedules dueAt further out", () => {
    const now = 1_000_000_000;
    let e = initialEntry(now);
    e = bump(e, now); // → box 2, +1 day
    expect(e.box).toBe(2);
    expect(e.dueAt).toBe(now + DAY);
    e = bump(e, now); // → box 3, +3 days
    expect(e.box).toBe(3);
    expect(e.dueAt).toBe(now + 3 * DAY);
  });

  it("bump caps at box 5", () => {
    const now = 1_000_000_000;
    let e = initialEntry(now);
    for (let i = 0; i < 10; i++) e = bump(e, now);
    expect(e.box).toBe(5);
    expect(e.dueAt).toBe(now + 14 * DAY);
  });

  it("demote resets to box 1 and due now", () => {
    const now = 1_000_000_000;
    let e = initialEntry(now);
    e = bump(e, now);
    e = bump(e, now);
    e = demote(e, now);
    expect(e.box).toBe(1);
    expect(isDue(e, now)).toBe(true);
  });
});
