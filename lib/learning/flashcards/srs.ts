import type { SRSEntry } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

const INTERVAL_DAYS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0,
  2: 1,
  3: 3,
  4: 7,
  5: 14,
};

export function initialEntry(now: number = Date.now()): SRSEntry {
  return { box: 1, dueAt: now, lastReviewedAt: now };
}

export function bump(entry: SRSEntry, now: number = Date.now()): SRSEntry {
  const nextBox = Math.min(5, entry.box + 1) as 1 | 2 | 3 | 4 | 5;
  return {
    box: nextBox,
    dueAt: now + INTERVAL_DAYS[nextBox] * DAY_MS,
    lastReviewedAt: now,
  };
}

export function demote(entry: SRSEntry, now: number = Date.now()): SRSEntry {
  return { box: 1, dueAt: now, lastReviewedAt: now };
}

export function isDue(entry: SRSEntry, now: number = Date.now()): boolean {
  return entry.dueAt <= now;
}
