import { describe, it, expect } from "vitest";
import { computeScore } from "./scoring";

describe("computeScore", () => {
  it("gives base score for a short word with no combo", () => {
    expect(computeScore({ length: 3, combo: 0 })).toBe(10);
  });

  it("adds length bonus for longer words", () => {
    // length 6 → +8
    expect(computeScore({ length: 6, combo: 0 })).toBe(18);
  });

  it("adds combo bonus capped at 10", () => {
    expect(computeScore({ length: 4, combo: 5 })).toBe(10 + 15);
    expect(computeScore({ length: 4, combo: 15 })).toBe(10 + 30);
  });

  it("adds speed bonus capped at 5", () => {
    expect(computeScore({ length: 4, combo: 0, secondsLeftFromLastAction: 9 })).toBe(
      10 + 3,
    );
    expect(computeScore({ length: 4, combo: 0, secondsLeftFromLastAction: 100 })).toBe(
      10 + 5,
    );
  });

  it("stacks length + combo + speed", () => {
    expect(
      computeScore({ length: 8, combo: 3, secondsLeftFromLastAction: 6 }),
    ).toBe(10 + 16 + 9 + 2);
  });
});
