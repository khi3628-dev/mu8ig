import { describe, it, expect } from "vitest";
import {
  computeLiveStatus,
  estimatedArrival,
  isTerminal,
  SIMULATED_TOTAL_SEC,
} from "../orderStatus";

function minutesLater(base: Date, seconds: number): Date {
  return new Date(base.getTime() + seconds * 1000);
}

describe("orderStatus", () => {
  const placed = new Date("2026-04-23T12:00:00Z");

  it("progresses through stages based on elapsed time", () => {
    expect(computeLiveStatus(placed, placed)).toBe("PENDING");
    expect(computeLiveStatus(placed, minutesLater(placed, 10))).toBe("PENDING");
    expect(computeLiveStatus(placed, minutesLater(placed, 30))).toBe("ACCEPTED");
    expect(computeLiveStatus(placed, minutesLater(placed, 100))).toBe("COOKING");
    expect(computeLiveStatus(placed, minutesLater(placed, 200))).toBe("DELIVERING");
    expect(computeLiveStatus(placed, minutesLater(placed, 400))).toBe("DELIVERED");
  });

  it("computes estimated arrival as placedAt + total seconds", () => {
    const eta = estimatedArrival(placed);
    expect(eta.getTime()).toBe(placed.getTime() + SIMULATED_TOTAL_SEC * 1000);
  });

  it("identifies terminal statuses", () => {
    expect(isTerminal("PENDING")).toBe(false);
    expect(isTerminal("ACCEPTED")).toBe(false);
    expect(isTerminal("DELIVERING")).toBe(false);
    expect(isTerminal("DELIVERED")).toBe(true);
    expect(isTerminal("CANCELLED")).toBe(true);
  });
});
