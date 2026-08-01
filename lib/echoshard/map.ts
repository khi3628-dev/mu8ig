// 직조분지 — GDD 3.2 전장 구조
// 요구사항: 3라인 + 양측 정글, 회전 대칭(진영 승률 49~51% 목표), 8:00 세계 접힘.
//
// 회전 대칭을 "설계로 보장"하기 위해, 벽을 손으로 배치하지 않고 규칙으로 생성한다.
// 라인·강·정글 통로가 모두 180도 회전 대칭이므로 그 결과인 벽 격자도 자동으로 대칭이 된다.
// 부록 C 불변식: "접힘 이후 폐쇄된 내비메시 링크를 어떤 이동 경로도 참조하지 않는다".

import { MAP_SIZE, CENTER } from './config';
import type { Vec2, Lane, Team } from './types';

export const CELL = 1; // 충돌 격자 1m
export const NAV_CELL = 2; // 경로 탐색 격자 2m
export const GRID = MAP_SIZE / CELL;
export const NAV_GRID = MAP_SIZE / NAV_CELL;

/** 180도 회전 대칭 사상 */
export function rot(p: Vec2): Vec2 {
  return { x: MAP_SIZE - p.x, y: MAP_SIZE - p.y };
}

export const BASE: Record<Team, Vec2> = {
  0: { x: 16, y: 104 },
  1: { x: 104, y: 16 },
};

/** 진영별 부활/출발 지점 */
export const SPAWN: Record<Team, Vec2> = {
  0: { x: 20, y: 100 },
  1: { x: 100, y: 20 },
};

/** 라인 경로. 팀 0 기준으로 정의하고 팀 1은 역순으로 사용한다(회전 대칭). */
export const LANE_PATH: Record<Lane, Vec2[]> = {
  TOP: [
    { x: 16, y: 104 },
    { x: 12, y: 78 },
    { x: 12, y: 42 },
    { x: 16, y: 16 },
    { x: 42, y: 12 },
    { x: 78, y: 12 },
    { x: 104, y: 16 },
  ],
  MID: [
    { x: 16, y: 104 },
    { x: 32, y: 88 },
    { x: 48, y: 72 },
    { x: 60, y: 60 },
    { x: 72, y: 48 },
    { x: 88, y: 32 },
    { x: 104, y: 16 },
  ],
  BOT: [
    { x: 16, y: 104 },
    { x: 42, y: 108 },
    { x: 78, y: 108 },
    { x: 104, y: 104 },
    { x: 108, y: 78 },
    { x: 108, y: 42 },
    { x: 104, y: 16 },
  ],
};

export const LANES: Lane[] = ['TOP', 'MID', 'BOT'];

/** 강: 미드에 수직인 대각선. 좌상 → 우하 */
const RIVER: Vec2[] = [
  { x: 14, y: 14 },
  { x: 40, y: 40 },
  { x: 60, y: 60 },
  { x: 80, y: 80 },
  { x: 106, y: 106 },
];

const LANE_HALF_WIDTH = 4.6;
const RIVER_HALF_WIDTH = 4.4;
const BASE_CLEAR_RADIUS = 13;

/** 정글 캠프 위치. 팀 0 진영 3곳을 정의하고 회전 대칭으로 팀 1 진영을 만든다(GDD 4.7: 진영당 3). */
const CAMP_BLUE: { pos: Vec2; name: string }[] = [
  { pos: { x: 30, y: 66 }, name: '균사 무리' },
  { pos: { x: 34, y: 100 }, name: '녹슨 화로' },
  { pos: { x: 62, y: 92 }, name: '잊힌 종' },
];

export const CAMPS: { pos: Vec2; name: string; team: Team }[] = [
  ...CAMP_BLUE.map((c) => ({ ...c, team: 0 as Team })),
  ...CAMP_BLUE.map((c) => ({ pos: rot(c.pos), name: c.name, team: 1 as Team })),
];

/** 정글 통로. 캠프와 라인·강을 잇는다. 팀 0 기준 정의 후 회전 대칭 추가. */
const CORRIDOR_BLUE: Vec2[][] = [
  [
    { x: 18, y: 88 },
    { x: 30, y: 66 },
    { x: 44, y: 56 },
  ],
  [
    { x: 30, y: 66 },
    { x: 34, y: 84 },
    { x: 34, y: 100 },
  ],
  [
    { x: 34, y: 100 },
    { x: 50, y: 98 },
    { x: 62, y: 92 },
  ],
  [
    { x: 62, y: 92 },
    { x: 72, y: 80 },
    { x: 80, y: 80 },
  ],
  [
    { x: 44, y: 56 },
    { x: 40, y: 40 },
  ],
];

const CORRIDORS: Vec2[][] = [...CORRIDOR_BLUE, ...CORRIDOR_BLUE.map((c) => c.map(rot))];
const CORRIDOR_HALF_WIDTH = 3.0;

/**
 * 세계 접힘 구역 — GDD 3.4: "외곽 정글 벽 4곳이 바닥으로 내려간다".
 * 팀 0 진영 2곳을 정의하고 회전 대칭으로 4곳을 만든다.
 * 8:00 이후 이 사각형은 통행 가능해지고, 외곽 정글에서 라인/강으로의 우회 거리가 줄어든다.
 */
const FOLD_BLUE: { min: Vec2; max: Vec2 }[] = [
  { min: { x: 20, y: 46 }, max: { x: 40, y: 54 } },
  { min: { x: 60, y: 100 }, max: { x: 68, y: 112 } },
];

export const FOLD_ZONES: { min: Vec2; max: Vec2 }[] = [
  ...FOLD_BLUE,
  ...FOLD_BLUE.map((z) => {
    const a = rot(z.min);
    const b = rot(z.max);
    return { min: { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) }, max: { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) } };
  }),
];

/** 부시. GDD 4.8: 벽과 부시가 시야를 차단한다. */
const BUSH_BLUE: { pos: Vec2; r: number }[] = [
  { pos: { x: 22, y: 62 }, r: 4 },
  { pos: { x: 44, y: 92 }, r: 4.5 },
  { pos: { x: 52, y: 66 }, r: 4 },
  { pos: { x: 84, y: 100 }, r: 4 },
];
export const BUSHES: { pos: Vec2; r: number }[] = [...BUSH_BLUE, ...BUSH_BLUE.map((b) => ({ pos: rot(b.pos), r: b.r }))];

// ---------------------------------------------------------------------------
// 격자 생성
// ---------------------------------------------------------------------------

function distToPolyline(p: Vec2, poly: Vec2[]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    best = Math.min(best, distToSegment(p, poly[i], poly[i + 1]));
  }
  return best;
}

export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  let t = len2 === 0 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + abx * t;
  const cy = a.y + aby * t;
  return Math.hypot(p.x - cx, p.y - cy);
}

function inRect(p: Vec2, r: { min: Vec2; max: Vec2 }): boolean {
  return p.x >= r.min.x && p.x <= r.max.x && p.y >= r.min.y && p.y <= r.max.y;
}

/** 접힘 전 기준으로 통행 가능한가 */
function openBeforeFold(p: Vec2): boolean {
  if (p.x < 2 || p.y < 2 || p.x > MAP_SIZE - 2 || p.y > MAP_SIZE - 2) return false;
  for (const lane of LANES) {
    if (distToPolyline(p, LANE_PATH[lane]) <= LANE_HALF_WIDTH) return true;
  }
  if (distToPolyline(p, RIVER) <= RIVER_HALF_WIDTH) return true;
  if (Math.hypot(p.x - BASE[0].x, p.y - BASE[0].y) <= BASE_CLEAR_RADIUS) return true;
  if (Math.hypot(p.x - BASE[1].x, p.y - BASE[1].y) <= BASE_CLEAR_RADIUS) return true;
  for (const c of CAMPS) {
    if (Math.hypot(p.x - c.pos.x, p.y - c.pos.y) <= 6) return true;
  }
  for (const cor of CORRIDORS) {
    if (distToPolyline(p, cor) <= CORRIDOR_HALF_WIDTH) return true;
  }
  return false;
}

export class Battlefield {
  /** true = 벽 */
  readonly wallBase: Uint8Array;
  /** 접힘 이후 열리는 셀 */
  readonly foldCells: Uint8Array;
  /** 현재 통행 격자 (접힘 상태 반영) */
  wall: Uint8Array;
  folded = false;

  constructor() {
    this.wallBase = new Uint8Array(GRID * GRID);
    this.foldCells = new Uint8Array(GRID * GRID);
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const p = { x: gx * CELL + CELL / 2, y: gy * CELL + CELL / 2 };
        const open = openBeforeFold(p);
        this.wallBase[gy * GRID + gx] = open ? 0 : 1;
        if (!open && FOLD_ZONES.some((z) => inRect(p, z))) {
          this.foldCells[gy * GRID + gx] = 1;
        }
      }
    }
    this.wall = Uint8Array.from(this.wallBase);
  }

  /** GDD 3.4 — 8:00 세계 접힘. 외곽 벽 4곳을 바닥으로 내린다. */
  applyFold(): void {
    if (this.folded) return;
    this.folded = true;
    for (let i = 0; i < this.wall.length; i++) {
      if (this.foldCells[i]) this.wall[i] = 0;
    }
  }

  reset(): void {
    this.folded = false;
    this.wall = Uint8Array.from(this.wallBase);
  }

  isWallAt(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return true;
    const gx = Math.floor(x / CELL);
    const gy = Math.floor(y / CELL);
    return this.wall[gy * GRID + gx] === 1;
  }

  /** 반지름을 가진 원이 놓일 수 있는가 */
  isFree(p: Vec2, radius: number): boolean {
    const r = Math.max(0.1, radius);
    // 4방향 + 중심 샘플링. 1m 격자에서 충분한 근사.
    if (this.isWallAt(p.x, p.y)) return false;
    if (this.isWallAt(p.x + r, p.y)) return false;
    if (this.isWallAt(p.x - r, p.y)) return false;
    if (this.isWallAt(p.x, p.y + r)) return false;
    if (this.isWallAt(p.x, p.y - r)) return false;
    return true;
  }

  /** 벽에 막히지 않고 두 점이 서로 보이는가 (시야·투사체 판정 공용) */
  lineOfSight(a: Vec2, b: Vec2): boolean {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-6) return true;
    const steps = Math.ceil(dist / 0.6);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (this.isWallAt(a.x + dx * t, a.y + dy * t)) return false;
    }
    return true;
  }

  /** 벽을 따라 미끄러지는 이동 해석 */
  resolveMove(from: Vec2, delta: Vec2, radius: number): Vec2 {
    const target = { x: from.x + delta.x, y: from.y + delta.y };
    if (this.isFree(target, radius)) return target;
    const slideX = { x: target.x, y: from.y };
    if (this.isFree(slideX, radius)) return slideX;
    const slideY = { x: from.x, y: target.y };
    if (this.isFree(slideY, radius)) return slideY;
    return { ...from };
  }

  /** 가장 가까운 통행 가능 지점 (접힘 시 벽 위 유닛을 밀어내는 데 사용) */
  nearestFree(p: Vec2, radius: number): Vec2 {
    if (this.isFree(p, radius)) return { ...p };
    for (let r = 1; r <= 20; r++) {
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        const q = { x: p.x + Math.cos(ang) * r, y: p.y + Math.sin(ang) * r };
        if (this.isFree(q, radius)) return q;
      }
    }
    return { ...CENTER };
  }

  isBush(p: Vec2): boolean {
    for (const b of BUSHES) {
      if (Math.hypot(p.x - b.pos.x, p.y - b.pos.y) <= b.r) return true;
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// 경로 탐색 (2m 격자 A*)
// ---------------------------------------------------------------------------

const NAV_DIRS: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

export class Navigator {
  private blocked: Uint8Array;
  private field: Battlefield;

  constructor(field: Battlefield) {
    this.field = field;
    this.blocked = new Uint8Array(NAV_GRID * NAV_GRID);
    this.rebuild();
  }

  rebuild(): void {
    for (let gy = 0; gy < NAV_GRID; gy++) {
      for (let gx = 0; gx < NAV_GRID; gx++) {
        const p = { x: gx * NAV_CELL + NAV_CELL / 2, y: gy * NAV_CELL + NAV_CELL / 2 };
        this.blocked[gy * NAV_GRID + gx] = this.field.isFree(p, 0.9) ? 0 : 1;
      }
    }
  }

  private toCell(p: Vec2): number {
    const gx = Math.max(0, Math.min(NAV_GRID - 1, Math.floor(p.x / NAV_CELL)));
    const gy = Math.max(0, Math.min(NAV_GRID - 1, Math.floor(p.y / NAV_CELL)));
    return gy * NAV_GRID + gx;
  }

  private cellCenter(idx: number): Vec2 {
    const gx = idx % NAV_GRID;
    const gy = Math.floor(idx / NAV_GRID);
    return { x: gx * NAV_CELL + NAV_CELL / 2, y: gy * NAV_CELL + NAV_CELL / 2 };
  }

  private nearestOpenCell(idx: number): number {
    if (!this.blocked[idx]) return idx;
    const gx0 = idx % NAV_GRID;
    const gy0 = Math.floor(idx / NAV_GRID);
    for (let r = 1; r <= 8; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const gx = gx0 + dx;
          const gy = gy0 + dy;
          if (gx < 0 || gy < 0 || gx >= NAV_GRID || gy >= NAV_GRID) continue;
          const j = gy * NAV_GRID + gx;
          if (!this.blocked[j]) return j;
        }
      }
    }
    return idx;
  }

  /** A*. 실패 시 목표 직선을 반환해 봇이 멈추지 않게 한다. */
  findPath(from: Vec2, to: Vec2): Vec2[] {
    const start = this.nearestOpenCell(this.toCell(from));
    const goal = this.nearestOpenCell(this.toCell(to));
    if (start === goal) return [to];

    const n = NAV_GRID * NAV_GRID;
    const g = new Float32Array(n).fill(Infinity);
    const f = new Float32Array(n).fill(Infinity);
    const cameFrom = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const open: number[] = [start];
    g[start] = 0;
    const gc = this.cellCenter(goal);
    f[start] = Math.hypot(from.x - gc.x, from.y - gc.y);

    let guard = 0;
    while (open.length && guard++ < 20000) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
      const cur = open.splice(bi, 1)[0];
      if (cur === goal) break;
      closed[cur] = 1;
      const cx = cur % NAV_GRID;
      const cy = Math.floor(cur / NAV_GRID);
      for (const [dx, dy, cost] of NAV_DIRS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= NAV_GRID || ny >= NAV_GRID) continue;
        const ni = ny * NAV_GRID + nx;
        if (this.blocked[ni] || closed[ni]) continue;
        // 대각 이동 시 모서리 관통 금지
        if (dx !== 0 && dy !== 0) {
          if (this.blocked[cy * NAV_GRID + nx] || this.blocked[ny * NAV_GRID + cx]) continue;
        }
        const tentative = g[cur] + cost * NAV_CELL;
        if (tentative < g[ni]) {
          g[ni] = tentative;
          cameFrom[ni] = cur;
          const c = this.cellCenter(ni);
          f[ni] = tentative + Math.hypot(c.x - gc.x, c.y - gc.y);
          if (!open.includes(ni)) open.push(ni);
        }
      }
    }

    if (cameFrom[goal] === -1 && goal !== start) return [to];
    const path: Vec2[] = [];
    let cur = goal;
    while (cur !== -1 && cur !== start) {
      path.push(this.cellCenter(cur));
      cur = cameFrom[cur];
    }
    path.reverse();
    path.push(to);
    return this.smooth(from, path);
  }

  /** 시야가 통하는 구간은 건너뛰어 지그재그를 제거한다 */
  private smooth(from: Vec2, path: Vec2[]): Vec2[] {
    if (path.length <= 2) return path;
    const out: Vec2[] = [];
    let anchor = from;
    let i = 0;
    while (i < path.length) {
      let j = path.length - 1;
      for (; j > i; j--) {
        if (this.field.lineOfSight(anchor, path[j])) break;
      }
      out.push(path[j]);
      anchor = path[j];
      if (j === i) i++;
      else i = j;
      if (j >= path.length - 1) break;
    }
    return out;
  }
}

/** 라인 경로를 팀 기준 방향으로 반환 */
export function lanePathFor(team: Team, lane: Lane): Vec2[] {
  const p = LANE_PATH[lane];
  return team === 0 ? p : [...p].slice().reverse();
}

/** 라인 위 t(0~1) 지점 */
export function pointOnLane(team: Team, lane: Lane, t: number): Vec2 {
  const path = lanePathFor(team, lane);
  const segLens: number[] = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
    segLens.push(d);
    total += d;
  }
  let target = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < segLens.length; i++) {
    if (target <= segLens[i]) {
      const f = segLens[i] === 0 ? 0 : target / segLens[i];
      return { x: path[i].x + (path[i + 1].x - path[i].x) * f, y: path[i].y + (path[i + 1].y - path[i].y) * f };
    }
    target -= segLens[i];
  }
  return { ...path[path.length - 1] };
}

/**
 * 구조물 배치 위치. t는 자기 진영 직조핵(t=0)에서 잰 라인 진행도이므로
 * 외곽 포탑이 더 바깥(큰 t), 내곽 포탑이 기지 쪽(작은 t)이어야 한다.
 * 팀 1은 1-t로 대칭 배치한다.
 */
export const TURRET_T = { OUTER: 0.4, INNER: 0.22 } as const;

/**
 * 중립 오브젝트 위치.
 *
 * 측정으로 확인한 제약: 강 위의 모든 점은 두 직조핵에서 유클리드 거리가 같지만,
 * 정글 통로 접근성 때문에 (40,40)은 적 진영, (80,80)은 청 진영이 먼저 도달한다.
 * 반복 생성되는 천정 고래를 한쪽에 고정했더니 진영 승률이 25% / 75%로 갈렸다.
 * (같은 시드 16경기에서 두 위치를 맞바꾸자 승률이 그대로 뒤집혔다.)
 *
 * 따라서 반복 오브젝트는 교대 생성하고, 단발성 심층 고래는 강 정중앙에 둔다.
 * GDD는 오브젝트 좌표를 규정하지 않으므로 문서 위반이 아니라 문서가 비워둔 칸을 채운 것이다.
 */
export const OBJECTIVE_POS = {
  /** 천정 고래는 이 두 지점을 번갈아 사용한다 */
  SKY_WHALE_A: { x: 40, y: 40 },
  SKY_WHALE_B: { x: 80, y: 80 },
  DEEP_WHALE: { x: 60, y: 60 },
  SCOUT_NODE: { x: 60, y: 60 },
} as const;
