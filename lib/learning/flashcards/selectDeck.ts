import type { Expression, SRSEntry } from "../types";
import { isDue } from "./srs";

/**
 * Order: due items first, then untouched items, then not-yet-due (sorted by
 * dueAt ascending). Filter by category if provided.
 */
export function selectDeck(
  expressions: Expression[],
  srsState: Record<string, SRSEntry>,
  opts: { category?: Expression["category"]; now?: number } = {},
): Expression[] {
  const now = opts.now ?? Date.now();
  const filtered = opts.category
    ? expressions.filter((e) => e.category === opts.category)
    : expressions;

  const due: Expression[] = [];
  const untouched: Expression[] = [];
  const scheduled: { e: Expression; entry: SRSEntry }[] = [];

  for (const e of filtered) {
    const entry = srsState[e.id];
    if (!entry) untouched.push(e);
    else if (isDue(entry, now)) due.push(e);
    else scheduled.push({ e, entry });
  }

  scheduled.sort((a, b) => a.entry.dueAt - b.entry.dueAt);
  return [...due, ...untouched, ...scheduled.map((s) => s.e)];
}

export function countDue(
  expressions: Expression[],
  srsState: Record<string, SRSEntry>,
  category?: Expression["category"],
  now: number = Date.now(),
): number {
  return expressions.filter((e) => {
    if (category && e.category !== category) return false;
    const entry = srsState[e.id];
    return !entry || isDue(entry, now);
  }).length;
}
