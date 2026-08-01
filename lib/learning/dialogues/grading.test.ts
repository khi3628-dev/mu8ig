import { describe, it, expect } from "vitest";
import { gradeFillBlank, gradeOrder } from "./grading";

describe("gradeFillBlank", () => {
  const blanks = [
    { turnIndex: 1, answer: "goal" },
    { turnIndex: 3, answer: "wrap" },
    { turnIndex: 4, answer: "point" },
  ];

  it("all correct", () => {
    const r = gradeFillBlank({ 1: "goal", 3: "wrap", 4: "point" }, blanks);
    expect(r.correct).toBe(3);
    expect(r.allCorrect).toBe(true);
  });

  it("case-insensitive and trims punctuation", () => {
    const r = gradeFillBlank({ 1: "GOAL.", 3: " Wrap ", 4: "point!" }, blanks);
    expect(r.correct).toBe(3);
  });

  it("partial correctness", () => {
    const r = gradeFillBlank({ 1: "goal", 3: "cover", 4: "" }, blanks);
    expect(r.correct).toBe(1);
    expect(r.allCorrect).toBe(false);
  });
});

describe("gradeOrder", () => {
  it("all correct", () => {
    const r = gradeOrder([1, 3, 0, 5, 2, 4], [1, 3, 0, 5, 2, 4]);
    expect(r.correct).toBe(true);
    expect(r.correctPositions).toBe(6);
  });

  it("partial correctness (correct positions only)", () => {
    const r = gradeOrder([1, 3, 0, 5, 4, 2], [1, 3, 0, 5, 2, 4]);
    expect(r.correct).toBe(false);
    expect(r.correctPositions).toBe(4);
  });
});
