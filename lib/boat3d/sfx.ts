// 레이스 상태 변화에서 효과음 이벤트를 뽑는다. 소리를 내는 쪽(Web Audio)과 분리해 테스트할 수 있게 한다.
import { FISH, MISS_MESSAGE, type RaceState } from "@/lib/boat/race";

export type SfxEvent =
  | { type: "tick" } // 카운트다운 3·2·1
  | { type: "go" }
  | { type: "boost" }
  | { type: "catch"; legend: boolean }
  | { type: "miss" }
  | { type: "checkpoint" }
  | { type: "lap" }
  | { type: "finish" }
  | { type: "gear" };

export interface SfxSnap {
  count: number; // 카운트다운 남은 숫자 (출발 후 0)
  boost: boolean;
  caught: number;
  lastSpecies: number | null;
  splits: number;
  lap: number;
  finished: boolean;
  msg: string;
  msgTimer: number;
}

export function sfxSnapshot(s: RaceState): SfxSnap {
  const p = s.racers[0];
  return {
    count: s.time < 0 ? Math.ceil(-s.time) : 0,
    boost: p.boost > 0,
    caught: s.caught.length,
    lastSpecies: s.lastCatch?.species ?? null,
    splits: s.recording.splits.length,
    lap: p.lap,
    finished: p.finishTime !== null,
    msg: s.message,
    msgTimer: s.messageTimer,
  };
}

export function sfxEvents(prev: SfxSnap, cur: SfxSnap): SfxEvent[] {
  const out: SfxEvent[] = [];
  if (cur.count !== prev.count) out.push(cur.count > 0 ? { type: "tick" } : { type: "go" });
  if (cur.boost && !prev.boost) out.push({ type: "boost" });
  if (cur.caught > prev.caught) out.push({ type: "catch", legend: cur.lastSpecies === FISH.length - 1 });
  // 허탕 메시지가 새로 떴을 때 (타이머가 다시 채워짐)
  if (cur.msg === MISS_MESSAGE && cur.msgTimer > prev.msgTimer) out.push({ type: "miss" });
  if (cur.splits > prev.splits) {
    if (cur.finished && !prev.finished) out.push({ type: "finish" });
    else if (cur.lap > prev.lap) out.push({ type: "lap" });
    else out.push({ type: "checkpoint" });
  }
  return out;
}
