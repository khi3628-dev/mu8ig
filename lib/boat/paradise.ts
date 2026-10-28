// 요트 파라다이스: 레이스·낚시로 번 돈으로 섬과 마리나에 시설을 짓는다.
// 진행 상황은 이 객체 하나로 직렬화해 저장한다.

import { BASE_STATS, NO_PERKS, type PlayerStats, type RacePerks } from "./race";

export const GRID_W = 10;
export const GRID_H = 8;
export const SAVE_VERSION = 2;
export const SELL_RATE = 0.5;

export type Terrain = "water" | "sand";
export type ItemId =
  | "palm" | "sunbed" | "bar" | "pool" | "villa" | "lighthouse"
  | "dock" | "yacht" | "superyacht";

export interface ItemDef {
  name: string;
  emoji: string;
  cost: number;
  on: Terrain;
  needsDock?: boolean; // 요트류는 부두 옆에만 정박할 수 있다
  luxury: number;
}

export const CATALOG: Record<ItemId, ItemDef> = {
  palm: { name: "야자수", emoji: "🌴", cost: 100, on: "sand", luxury: 1 },
  sunbed: { name: "선베드", emoji: "🏖️", cost: 200, on: "sand", luxury: 2 },
  bar: { name: "비치 바", emoji: "🍹", cost: 600, on: "sand", luxury: 6 },
  pool: { name: "인피니티 풀", emoji: "🏊", cost: 1200, on: "sand", luxury: 12 },
  villa: { name: "화이트 빌라", emoji: "🏡", cost: 2000, on: "sand", luxury: 20 },
  lighthouse: { name: "등대", emoji: "🗼", cost: 3000, on: "sand", luxury: 30 },
  dock: { name: "부두", emoji: "🪵", cost: 300, on: "water", luxury: 2 },
  yacht: { name: "요트", emoji: "⛵", cost: 2500, on: "water", needsDock: true, luxury: 25 },
  superyacht: { name: "슈퍼요트", emoji: "🛥️", cost: 8000, on: "water", needsDock: true, luxury: 80 },
};

// 시설 하나당 레이스 효과. 같은 효과는 더해지고 PERK_CAPS에서 멈춘다.
export const ITEM_PERKS: Partial<Record<ItemId, Partial<RacePerks>>> = {
  sunbed: { prize: 0.03 },
  villa: { prize: 0.1 },
  palm: { fish: 0.02 },
  bar: { fish: 0.15 },
  yacht: { startSpeed: 5 },
  superyacht: { startSpeed: 12 },
  pool: { boost: 0.1 },
  lighthouse: { boost: 0.3 },
};

export const PERK_CAPS: RacePerks = { prize: 0.5, fish: 1, startSpeed: 20, boost: 1 };

const PERK_KEYS = Object.keys(NO_PERKS) as (keyof RacePerks)[];

export function racePerks(save: Save): RacePerks {
  const sum = { ...NO_PERKS };
  for (const c of save.cells) {
    const p = c.item ? ITEM_PERKS[c.item] : undefined;
    if (p) for (const k of PERK_KEYS) sum[k] += p[k] ?? 0;
  }
  for (const k of PERK_KEYS) sum[k] = Math.min(PERK_CAPS[k], Math.round(sum[k] * 1000) / 1000);
  return sum;
}

export function perkLabel(p: Partial<RacePerks>) {
  const parts: string[] = [];
  if (p.prize) parts.push(`상금 +${Math.round(p.prize * 100)}%`);
  if (p.fish) parts.push(`낚시 +${Math.round(p.fish * 100)}%`);
  if (p.startSpeed) parts.push(`출발 대시 +${Math.round(p.startSpeed * 3.6)}km/h`);
  if (p.boost) parts.push(`부스트 +${Math.round(p.boost * 100)}%`);
  return parts.join(" · ");
}

export const RECLAIM_COST = 400; // 바다를 메워 모래섬 확장

export const LEVELS: { luxury: number; title: string }[] = [
  { luxury: 0, title: "무인도" },
  { luxury: 10, title: "작은 해변" },
  { luxury: 40, title: "프라이빗 비치" },
  { luxury: 100, title: "럭셔리 마리나" },
  { luxury: 200, title: "요트 파라다이스" },
];

export interface Cell {
  terrain: Terrain;
  item: ItemId | null;
}

export type UpgradeId = "engine" | "handling" | "net";

export interface UpgradeDef {
  name: string;
  emoji: string;
  desc: string;
  costs: number[]; // 레벨별 가격. 길이가 최대 레벨
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  engine: { name: "엔진", emoji: "🚀", desc: "최고 속도 +1.5", costs: [400, 800, 1500, 2500, 4000] },
  handling: { name: "핸들링", emoji: "🌀", desc: "회전력 +10%", costs: [300, 600, 1100, 1800, 3000] },
  net: { name: "낚시 그물", emoji: "🎣", desc: "낚시 범위 +2m", costs: [250, 500, 900, 1500, 2500] },
};

export interface Save {
  version: number;
  money: number;
  upgrades: Record<UpgradeId, number>;
  cells: Cell[];
  races: number;
  bestRank: number | null;
  fishCaught: number;
}

export function createSave(): Save {
  const cells: Cell[] = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const island = x >= 3 && x <= 6 && y >= 3 && y <= 5;
      cells.push({ terrain: island ? "sand" : "water", item: null });
    }
  }
  return {
    version: SAVE_VERSION,
    money: 500,
    upgrades: { engine: 0, handling: 0, net: 0 },
    cells,
    races: 0,
    bestRank: null,
    fishCaught: 0,
  };
}

export function loadSave(raw: string | null): Save {
  if (!raw) return createSave();
  try {
    const s = JSON.parse(raw) as Save;
    if (!Array.isArray(s.cells) || s.cells.length !== GRID_W * GRID_H) return createSave();
    if (s.version === 1) {
      // v1 → v2: 업그레이드 필드 추가
      s.version = 2;
      s.upgrades = { engine: 0, handling: 0, net: 0 };
    }
    if (s.version !== SAVE_VERSION) return createSave();
    return s;
  } catch {
    return createSave();
  }
}

function neighbors(i: number) {
  const x = i % GRID_W, y = Math.floor(i / GRID_W);
  return [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .map(([dx, dy]) => [x + dx, y + dy])
    .filter(([nx, ny]) => nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H)
    .map(([nx, ny]) => ny * GRID_W + nx);
}

// 설치 불가 사유를 돌려준다. null이면 설치 가능.
export function placeError(save: Save, i: number, id: ItemId): string | null {
  const cell = save.cells[i];
  const def = CATALOG[id];
  if (cell.item) return "이미 시설이 있다";
  if (cell.terrain !== def.on) return def.on === "sand" ? "모래섬 위에만 지을 수 있다" : "바다 위에만 지을 수 있다";
  if (def.needsDock && !neighbors(i).some((n) => save.cells[n].item === "dock")) return "부두 옆에만 정박할 수 있다";
  if (save.money < def.cost) return "돈이 부족하다";
  return null;
}

export function place(save: Save, i: number, id: ItemId): string | null {
  const err = placeError(save, i, id);
  if (err) return err;
  save.money -= CATALOG[id].cost;
  save.cells[i].item = id;
  return null;
}

export function reclaimError(save: Save, i: number): string | null {
  if (save.cells[i].terrain === "sand") return "이미 모래섬이다";
  if (save.cells[i].item) return "시설을 먼저 치워야 한다";
  if (!neighbors(i).some((n) => save.cells[n].terrain === "sand")) return "섬에 붙여서만 메울 수 있다";
  if (save.money < RECLAIM_COST) return "돈이 부족하다";
  return null;
}

export function reclaim(save: Save, i: number): string | null {
  const err = reclaimError(save, i);
  if (err) return err;
  save.money -= RECLAIM_COST;
  save.cells[i].terrain = "sand";
  return null;
}

// 시설을 팔아 절반을 돌려받는다. 정박 중인 요트가 있는 부두는 팔 수 없다.
export function sell(save: Save, i: number): string | null {
  const id = save.cells[i].item;
  if (!id) return "팔 시설이 없다";
  if (id === "dock") {
    const stranded = neighbors(i).some((n) => {
      const item = save.cells[n].item;
      if (!item || !CATALOG[item].needsDock) return false;
      return !neighbors(n).some((m) => m !== i && save.cells[m].item === "dock");
    });
    if (stranded) return "정박 중인 요트가 있다";
  }
  save.money += Math.floor(CATALOG[id].cost * SELL_RATE);
  save.cells[i].item = null;
  return null;
}

export function luxury(save: Save) {
  return save.cells.reduce((s, c) => s + (c.item ? CATALOG[c.item].luxury : 0), 0);
}

export function level(save: Save) {
  const lux = luxury(save);
  let idx = 0;
  LEVELS.forEach((l, i) => { if (lux >= l.luxury) idx = i; });
  return { index: idx, ...LEVELS[idx], next: LEVELS[idx + 1] ?? null };
}

export function applyRaceReward(save: Save, rank: number, prize: number, fishCoins: number, fishCount: number) {
  save.money += prize + fishCoins;
  save.races += 1;
  save.fishCaught += fishCount;
  save.bestRank = save.bestRank === null ? rank : Math.min(save.bestRank, rank);
}

export function upgradeCost(save: Save, id: UpgradeId): number | null {
  return UPGRADES[id].costs[save.upgrades[id]] ?? null;
}

export function buyUpgrade(save: Save, id: UpgradeId): string | null {
  const cost = upgradeCost(save, id);
  if (cost === null) return "최대 레벨이다";
  if (save.money < cost) return "돈이 부족하다";
  save.money -= cost;
  save.upgrades[id] += 1;
  return null;
}

export function playerStats(save: Save): PlayerStats {
  const u = save.upgrades;
  return {
    topSpeed: BASE_STATS.topSpeed + u.engine * 1.5,
    turnRate: BASE_STATS.turnRate * (1 + u.handling * 0.1),
    catchRadius: BASE_STATS.catchRadius + u.net * 2,
  };
}
