import type { DailyChallenge } from "../types";

/**
 * Deterministic day-of-year pick so every user sees the same challenge on the
 * same date without needing a server.
 */
export function dayOfYear(now: Date = new Date()): number {
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function pickToday<T extends DailyChallenge>(
  challenges: T[],
  now: Date = new Date(),
): T | null {
  if (!challenges.length) return null;
  const idx = dayOfYear(now) % challenges.length;
  return challenges[idx];
}
