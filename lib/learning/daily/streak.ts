import type { StreakState } from "../types";

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysISO(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return todayISO(d);
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.round((db - da) / (24 * 60 * 60 * 1000));
}

/**
 * Compute next streak state given previous state and today's ISO date.
 * - Same day: no change.
 * - Consecutive day (diff = 1): +1 current, update longest.
 * - Any other gap: reset to 1.
 * - First ever completion: 1.
 */
export function nextStreak(prev: StreakState, todayIso: string): StreakState {
  const last = prev.lastCompletedISODate;
  if (!last) {
    return {
      current: 1,
      longest: Math.max(prev.longest, 1),
      lastCompletedISODate: todayIso,
    };
  }
  if (last === todayIso) {
    return prev;
  }
  const gap = daysBetween(last, todayIso);
  if (gap === 1) {
    const current = prev.current + 1;
    return {
      current,
      longest: Math.max(prev.longest, current),
      lastCompletedISODate: todayIso,
    };
  }
  return {
    current: 1,
    longest: Math.max(prev.longest, 1),
    lastCompletedISODate: todayIso,
  };
}
