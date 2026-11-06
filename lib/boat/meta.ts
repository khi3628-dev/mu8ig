// 레이스 밖의 진행 요소: 스킨 상점, 매일 접속 보상, 일일 미션, 서포터 팩, 설정.
// 레이스 규칙(race.ts)과 섬 저장(paradise.ts)은 건드리지 않고 별도 저장(MetaSave)으로 둔다.
// 날짜는 호출하는 쪽이 "YYYY-MM-DD"(사용자 현지 날짜)로 넘긴다 → 테스트에서 날짜를 마음대로 정할 수 있다.
import type { RaceResult } from "./race";

export const META_VERSION = 1;

// ── 스킨 ─────────────────────────────────────────────
export interface Skin {
  id: string;
  name: string;
  deck: number; // 선체
  stripe: number; // 금속 띠·장식선
  suit: number;
  helmet: number;
  visor: number;
  price: number; // CR. 0이면 기본 지급
  supporter?: boolean; // 서포터 팩 전용
}

export const SKINS: Skin[] = [
  { id: "classic", name: "화이트 골드", deck: 0xf8fafc, stripe: 0xd4a93a, suit: 0xf8fafc, helmet: 0xf8fafc, visor: 0xd4a93a, price: 0 },
  { id: "ocean", name: "오션 블루", deck: 0x38bdf8, stripe: 0xf8fafc, suit: 0xe0f2fe, helmet: 0x38bdf8, visor: 0x0f172a, price: 1500 },
  { id: "sunset", name: "선셋 코랄", deck: 0xfb7185, stripe: 0xfde68a, suit: 0xfff1f2, helmet: 0xfb7185, visor: 0x7c2d12, price: 2500 },
  { id: "carbon", name: "카본 블랙", deck: 0x18181b, stripe: 0xd4a93a, suit: 0x27272a, helmet: 0x18181b, visor: 0xd4a93a, price: 4000 },
  { id: "emerald", name: "에메랄드", deck: 0x10b981, stripe: 0xf8fafc, suit: 0xecfdf5, helmet: 0x059669, visor: 0x022c22, price: 6000 },
  { id: "platinum", name: "플래티넘", deck: 0xe5e7eb, stripe: 0x94a3b8, suit: 0xf1f5f9, helmet: 0xcbd5e1, visor: 0x38bdf8, price: 0, supporter: true },
  { id: "royal", name: "로열 퍼플", deck: 0x6d28d9, stripe: 0xfacc15, suit: 0xf5f3ff, helmet: 0x6d28d9, visor: 0xfacc15, price: 0, supporter: true },
];

export const skinById = (id: string) => SKINS.find((s) => s.id === id) ?? SKINS[0];

// ── 매일 접속 보상 (7일 주기, 하루라도 빠지면 1일차부터) ──
export const DAILY_REWARDS = [200, 300, 400, 500, 700, 900, 1500];

// ── 일일 미션 ─────────────────────────────────────────
export type MissionKind = "win" | "podium" | "fish" | "marlin" | "races" | "record";
export interface MissionDef { kind: MissionKind; target: number; reward: number; text: string }

export const MISSION_POOL: MissionDef[] = [
  { kind: "races", target: 3, reward: 300, text: "레이스 3번 완주" },
  { kind: "fish", target: 6, reward: 400, text: "물고기 6마리 낚기" },
  { kind: "podium", target: 2, reward: 500, text: "3위 안에 2번 들기" },
  { kind: "win", target: 1, reward: 700, text: "1위 하기" },
  { kind: "record", target: 1, reward: 600, text: "베스트 기록 갈아치우기" },
  { kind: "marlin", target: 1, reward: 900, text: "황금 청새치 낚기" },
];
export const MISSIONS_PER_DAY = 3;
const MARLIN = 3; // race.ts FISH의 황금 청새치 인덱스

export interface MissionState { kind: MissionKind; progress: number; claimed: boolean }

// ── 광고·서포터 ──────────────────────────────────────
export const INTERSTITIAL_EVERY = 2; // 레이스 2번마다 한 번, 쉬는 시점(파라다이스로 돌아갈 때)에만
export const INTERSTITIAL_GRACE = 3; // 처음 3번의 레이스는 광고 없이

export interface Settings { music: number; sfx: number } // 0..1

export interface MetaSave {
  version: number;
  skin: string;
  owned: string[];
  supporter: boolean; // 서포터 팩 구매: 전용 스킨 + 레이스 사이 광고 제거
  dailyLast: string | null; // 마지막으로 접속 보상을 받은 날
  streak: number; // 연속 접속 일수
  missionDay: string | null;
  missions: MissionState[];
  racesSinceAd: number;
  totalRaces: number;
  tutorialDone: boolean;
  settings: Settings;
}

export function createMeta(): MetaSave {
  return {
    version: META_VERSION,
    skin: "classic",
    owned: ["classic"],
    supporter: false,
    dailyLast: null,
    streak: 0,
    missionDay: null,
    missions: [],
    racesSinceAd: 0,
    totalRaces: 0,
    tutorialDone: false,
    settings: { music: 0.8, sfx: 1 },
  };
}

const clamp01 = (v: unknown, d: number) => (typeof v === "number" && v >= 0 && v <= 1 ? v : d);

// 깨졌거나 예전 저장이어도 기본값으로 메워서 연다 (사용자 진행을 날리지 않는다)
export function loadMeta(raw: string | null): MetaSave {
  const base = createMeta();
  if (!raw) return base;
  let d: Partial<MetaSave>;
  try {
    d = JSON.parse(raw);
  } catch {
    return base;
  }
  if (!d || typeof d !== "object") return base;
  const owned = Array.isArray(d.owned) ? d.owned.filter((id) => SKINS.some((s) => s.id === id)) : [];
  if (!owned.includes("classic")) owned.unshift("classic");
  const supporter = d.supporter === true;
  const skin = typeof d.skin === "string" && canUse({ ...base, owned, supporter }, d.skin) ? d.skin : "classic";
  return {
    ...base,
    skin,
    owned,
    supporter,
    dailyLast: typeof d.dailyLast === "string" ? d.dailyLast : null,
    streak: Number.isInteger(d.streak) && d.streak! > 0 ? d.streak! : 0,
    missionDay: typeof d.missionDay === "string" ? d.missionDay : null,
    missions: Array.isArray(d.missions)
      ? d.missions.filter((m) => MISSION_POOL.some((p) => p.kind === m?.kind)).map((m) => ({
          kind: m.kind,
          progress: Math.max(0, Number(m.progress) || 0),
          claimed: m.claimed === true,
        }))
      : [],
    racesSinceAd: Math.max(0, Number(d.racesSinceAd) || 0),
    totalRaces: Math.max(0, Number(d.totalRaces) || 0),
    tutorialDone: d.tutorialDone === true,
    settings: { music: clamp01(d.settings?.music, base.settings.music), sfx: clamp01(d.settings?.sfx, base.settings.sfx) },
  };
}

// ── 날짜 ─────────────────────────────────────────────
export function localDay(d: Date = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function dayBefore(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return localDay(new Date(y, m - 1, d - 1));
}

// ── 스킨 ─────────────────────────────────────────────
export function canUse(meta: MetaSave, id: string) {
  const s = SKINS.find((k) => k.id === id);
  if (!s) return false;
  return s.supporter ? meta.supporter : meta.owned.includes(id);
}

// money는 섬 저장(paradise Save)의 돈. 성공하면 남은 돈을, 실패하면 이유를 돌려준다
export function buySkin(meta: MetaSave, id: string, money: number): { money: number } | { error: string } {
  const s = SKINS.find((k) => k.id === id);
  if (!s) return { error: "없는 스킨" };
  if (s.supporter) return { error: "서포터 팩 전용 스킨" };
  if (meta.owned.includes(id)) return { error: "이미 가진 스킨" };
  if (money < s.price) return { error: `${s.price - money} CR 부족` };
  meta.owned.push(id);
  meta.skin = id;
  return { money: money - s.price };
}

export function equipSkin(meta: MetaSave, id: string): string | null {
  if (!canUse(meta, id)) return "아직 없는 스킨";
  meta.skin = id;
  return null;
}

// ── 매일 접속 보상 ───────────────────────────────────
export function dailyAvailable(meta: MetaSave, today: string) {
  return meta.dailyLast !== today;
}

// 오늘 받을 보상 (받기 전에 보여 주는 용도)
export function nextDailyReward(meta: MetaSave, today: string) {
  const streak = meta.dailyLast === dayBefore(today) ? meta.streak + 1 : 1;
  return { day: ((streak - 1) % DAILY_REWARDS.length) + 1, amount: DAILY_REWARDS[(streak - 1) % DAILY_REWARDS.length] };
}

// 받은 금액을 돌려준다 (이미 받았으면 0)
export function claimDaily(meta: MetaSave, today: string): number {
  if (!dailyAvailable(meta, today)) return 0;
  const { amount } = nextDailyReward(meta, today);
  meta.streak = meta.dailyLast === dayBefore(today) ? meta.streak + 1 : 1;
  meta.dailyLast = today;
  return amount;
}

// ── 일일 미션 ─────────────────────────────────────────
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// 날짜마다 정해진 3개 (모두에게 같은 미션 → 공유·커뮤니티에 유리)
export function missionsFor(day: string): MissionKind[] {
  const pool = MISSION_POOL.map((m) => m.kind);
  const out: MissionKind[] = [];
  let h = hash(day);
  while (out.length < MISSIONS_PER_DAY) {
    const k = pool[h % pool.length];
    if (!out.includes(k)) out.push(k);
    h = hash(String(h));
  }
  return out;
}

// 날짜가 바뀌었으면 오늘 미션으로 갈아 끼운다
export function refreshMissions(meta: MetaSave, today: string) {
  if (meta.missionDay === today && meta.missions.length === MISSIONS_PER_DAY) return;
  meta.missionDay = today;
  meta.missions = missionsFor(today).map((kind) => ({ kind, progress: 0, claimed: false }));
}

export const missionDef = (kind: MissionKind) => MISSION_POOL.find((m) => m.kind === kind)!;

function gain(kind: MissionKind, r: RaceResult): number {
  switch (kind) {
    case "races": return r.finished ? 1 : 0;
    case "fish": return r.caught.length;
    case "podium": return r.finished && r.rank <= 3 ? 1 : 0;
    case "win": return r.finished && r.rank === 1 ? 1 : 0;
    case "record": return r.run && r.bestBefore !== null && r.run.time < r.bestBefore ? 1 : 0;
    case "marlin": return r.caught.filter((s) => s === MARLIN).length;
  }
}

// 레이스가 끝날 때마다 부른다. 이번 레이스로 새로 달성한 미션 목록을 돌려준다
export function recordRace(meta: MetaSave, r: RaceResult, today: string): MissionKind[] {
  refreshMissions(meta, today);
  meta.totalRaces += 1;
  meta.racesSinceAd += 1;
  const done: MissionKind[] = [];
  for (const m of meta.missions) {
    const def = missionDef(m.kind);
    if (m.progress >= def.target) continue;
    m.progress = Math.min(def.target, m.progress + gain(m.kind, r));
    if (m.progress >= def.target) done.push(m.kind);
  }
  return done;
}

// 보상 금액 (조건 미달·이미 받음이면 0)
export function claimMission(meta: MetaSave, kind: MissionKind): number {
  const m = meta.missions.find((x) => x.kind === kind);
  if (!m || m.claimed) return 0;
  const def = missionDef(kind);
  if (m.progress < def.target) return 0;
  m.claimed = true;
  return def.reward;
}

// ── 광고 ─────────────────────────────────────────────
// 레이스 사이(파라다이스로 돌아갈 때) 전면 광고를 띄울 차례인지
export function interstitialDue(meta: MetaSave) {
  return !meta.supporter && meta.totalRaces > INTERSTITIAL_GRACE && meta.racesSinceAd >= INTERSTITIAL_EVERY;
}

export function markInterstitial(meta: MetaSave) {
  meta.racesSinceAd = 0;
}

// 서포터 팩 구매 처리 (결제 확인은 플랫폼 쪽에서 끝난 뒤 부른다)
export function grantSupporter(meta: MetaSave) {
  meta.supporter = true;
}
