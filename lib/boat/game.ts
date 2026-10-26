// 보트(뗏목) 서바이벌 게임 로직. 렌더링과 분리해 순수 함수로 두어 테스트할 수 있게 한다.
// 좌표 단위는 타일(1 = 뗏목 한 칸). 해류는 +y 방향으로 흐른다.

export type DebrisKind = "plank" | "plastic" | "coconut" | "bottle" | "barrel";
export type Resource = "plank" | "plastic" | "food" | "water";

export interface Debris {
  id: number;
  kind: DebrisKind;
  x: number;
  y: number;
}

export interface Hook {
  x: number;
  y: number;
  tx: number;
  ty: number;
  returning: boolean;
  carried: Debris[];
}

export interface Shark {
  x: number;
  y: number;
  hp: number;
  mode: "circle" | "attack" | "flee" | "dead";
  target: string | null;
  timer: number; // 모드별 남은 시간
  biteTimer: number;
  angle: number;
}

export interface Input {
  dx: number; // -1..1
  dy: number;
}

export interface GameState {
  time: number;
  raft: Map<string, number>; // "x,y" -> 내구도
  player: { x: number; y: number };
  hunger: number;
  thirst: number;
  health: number;
  inv: Record<Resource, number>;
  debris: Debris[];
  hook: Hook | null;
  shark: Shark;
  nextId: number;
  spawnTimer: number;
  message: string;
  over: boolean;
}

export const TILE_HP = 3;
export const BUILD_COST = { plank: 2, plastic: 1 };
export const REPAIR_COST = { plank: 1 };
export const DAY_SECONDS = 60;

const PLAYER_SPEED = 3;
const CURRENT_SPEED = 0.6;
const HOOK_RANGE = 6;
const HOOK_SPEED = 10;
const HOOK_GRAB_RADIUS = 0.7;
const REACH = 2.5;
const SHARK_ATTACK_INTERVAL = 20;
const SHARK_BITE_INTERVAL = 1.5;
const SHARK_RESPAWN = 30;
const SPEAR_RANGE = 2;

export const key = (x: number, y: number) => `${x},${y}`;

export function parseKey(k: string): [number, number] {
  const [x, y] = k.split(",").map(Number);
  return [x, y];
}

export function cellAt(x: number, y: number): [number, number] {
  return [Math.floor(x), Math.floor(y)];
}

export function createGame(): GameState {
  const raft = new Map<string, number>();
  for (let x = -1; x <= 0; x++) for (let y = -1; y <= 0; y++) raft.set(key(x, y), TILE_HP);
  return {
    time: 0,
    raft,
    player: { x: 0, y: 0 },
    hunger: 100,
    thirst: 100,
    health: 100,
    inv: { plank: 4, plastic: 2, food: 1, water: 1 },
    debris: [],
    hook: null,
    shark: { ...newShark(), y: -6 },
    nextId: 1,
    spawnTimer: 0,
    message: "WASD 이동 · 클릭으로 갈고리 던지기",
    over: false,
  };
}

function newShark(): Shark {
  return {
    x: 0, y: 0, hp: 3, mode: "circle", target: null,
    timer: SHARK_ATTACK_INTERVAL, biteTimer: 0, angle: 0,
  };
}

export function day(state: GameState) {
  return Math.floor(state.time / DAY_SECONDS) + 1;
}

function onRaft(state: GameState, x: number, y: number) {
  const [cx, cy] = cellAt(x, y);
  return state.raft.has(key(cx, cy));
}

function raftCenter(state: GameState): [number, number] {
  let sx = 0, sy = 0;
  for (const k of state.raft.keys()) {
    const [x, y] = parseKey(k);
    sx += x + 0.5;
    sy += y + 0.5;
  }
  const n = Math.max(state.raft.size, 1);
  return [sx / n, sy / n];
}

function isEdge(state: GameState, k: string) {
  const [x, y] = parseKey(k);
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !state.raft.has(key(x + dx, y + dy)));
}

export function update(state: GameState, dt: number, input: Input, rand: () => number = Math.random) {
  if (state.over) return;
  state.time += dt;

  // 플레이어 이동: 축별로 시도해 뗏목 밖으로 나가지 않게 한다
  const len = Math.hypot(input.dx, input.dy) || 1;
  const mx = (input.dx / len) * PLAYER_SPEED * dt;
  const my = (input.dy / len) * PLAYER_SPEED * dt;
  if (onRaft(state, state.player.x + mx, state.player.y)) state.player.x += mx;
  if (onRaft(state, state.player.x, state.player.y + my)) state.player.y += my;

  // 생존 수치
  state.hunger = Math.max(0, state.hunger - 0.8 * dt);
  state.thirst = Math.max(0, state.thirst - 1.1 * dt);
  if (state.hunger === 0 || state.thirst === 0) state.health -= 2 * dt;
  else if (state.hunger > 50 && state.thirst > 50) state.health = Math.min(100, state.health + 0.5 * dt);
  if (state.health <= 0) {
    state.health = 0;
    state.over = true;
    state.message = `${day(state)}일째에 쓰러졌다...`;
    return;
  }

  updateDebris(state, dt, rand);
  updateHook(state, dt);
  updateShark(state, dt, rand);
}

function updateDebris(state: GameState, dt: number, rand: () => number) {
  const [cx, cy] = raftCenter(state);
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    state.spawnTimer = 0.8 + rand() * 1.2;
    const r = rand();
    const kind: DebrisKind =
      r < 0.35 ? "plank" : r < 0.65 ? "plastic" : r < 0.8 ? "coconut" : r < 0.92 ? "bottle" : "barrel";
    state.debris.push({ id: state.nextId++, kind, x: cx + (rand() - 0.5) * 16, y: cy - 9 });
  }
  for (const d of state.debris) d.y += CURRENT_SPEED * dt;
  state.debris = state.debris.filter((d) => d.y < cy + 14 && !onRaft(state, d.x, d.y));
}

export function throwHook(state: GameState, tx: number, ty: number) {
  if (state.over || state.hook) return;
  const { x, y } = state.player;
  const dist = Math.hypot(tx - x, ty - y);
  const s = dist > HOOK_RANGE ? HOOK_RANGE / dist : 1;
  state.hook = { x, y, tx: x + (tx - x) * s, ty: y + (ty - y) * s, returning: false, carried: [] };
}

function updateHook(state: GameState, dt: number) {
  const h = state.hook;
  if (!h) return;
  const goalX = h.returning ? state.player.x : h.tx;
  const goalY = h.returning ? state.player.y : h.ty;
  const dist = Math.hypot(goalX - h.x, goalY - h.y);
  const step = HOOK_SPEED * dt;
  if (dist <= step) {
    h.x = goalX;
    h.y = goalY;
    if (h.returning) {
      for (const d of h.carried) collect(state, d.kind);
      state.hook = null;
      return;
    }
    h.returning = true;
  } else {
    h.x += ((goalX - h.x) / dist) * step;
    h.y += ((goalY - h.y) / dist) * step;
  }
  // 경로상의 부유물을 낚아챈다
  const caught = state.debris.filter((d) => Math.hypot(d.x - h.x, d.y - h.y) < HOOK_GRAB_RADIUS);
  if (caught.length) {
    h.carried.push(...caught);
    state.debris = state.debris.filter((d) => !caught.includes(d));
    h.returning = true;
  }
  for (const d of h.carried) {
    d.x = h.x;
    d.y = h.y;
  }
}

export function collect(state: GameState, kind: DebrisKind) {
  switch (kind) {
    case "plank": state.inv.plank += 1; break;
    case "plastic": state.inv.plastic += 1; break;
    case "coconut": state.inv.food += 1; break;
    case "bottle": state.inv.water += 1; break;
    case "barrel":
      state.inv.plank += 3;
      state.inv.plastic += 2;
      state.inv.food += 1;
      state.inv.water += 1;
      state.message = "통을 열었다! 판자+3 플라스틱+2 식량+1 물+1";
      break;
  }
}

export function eat(state: GameState) {
  if (state.over) return;
  if (state.inv.food <= 0) { state.message = "식량이 없다"; return; }
  state.inv.food -= 1;
  state.hunger = Math.min(100, state.hunger + 30);
}

export function drink(state: GameState) {
  if (state.over) return;
  if (state.inv.water <= 0) { state.message = "물이 없다"; return; }
  state.inv.water -= 1;
  state.thirst = Math.min(100, state.thirst + 35);
}

// 우클릭: 빈 바다 칸이면 건설, 손상된 뗏목 칸이면 수리
export function buildOrRepair(state: GameState, wx: number, wy: number) {
  if (state.over) return;
  const [cx, cy] = cellAt(wx, wy);
  const k = key(cx, cy);
  if (Math.hypot(cx + 0.5 - state.player.x, cy + 0.5 - state.player.y) > REACH) {
    state.message = "너무 멀다";
    return;
  }
  const hp = state.raft.get(k);
  if (hp !== undefined) {
    if (hp >= TILE_HP) return;
    if (state.inv.plank < REPAIR_COST.plank) { state.message = "판자가 부족하다"; return; }
    state.inv.plank -= REPAIR_COST.plank;
    state.raft.set(k, TILE_HP);
    state.message = "수리 완료";
    return;
  }
  const adjacent = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => state.raft.has(key(cx + dx, cy + dy)));
  if (!adjacent) { state.message = "뗏목에 붙여서 지어야 한다"; return; }
  if (state.inv.plank < BUILD_COST.plank || state.inv.plastic < BUILD_COST.plastic) {
    state.message = `재료 부족 (판자 ${BUILD_COST.plank}, 플라스틱 ${BUILD_COST.plastic})`;
    return;
  }
  state.inv.plank -= BUILD_COST.plank;
  state.inv.plastic -= BUILD_COST.plastic;
  state.raft.set(k, TILE_HP);
}

export function attack(state: GameState) {
  const s = state.shark;
  if (state.over || s.mode === "dead") return;
  if (Math.hypot(s.x - state.player.x, s.y - state.player.y) > SPEAR_RANGE) return;
  s.hp -= 1;
  if (s.hp <= 0) {
    s.mode = "dead";
    s.timer = SHARK_RESPAWN;
    state.inv.food += 3;
    state.message = "상어를 물리쳤다! 식량+3";
  } else {
    s.mode = "flee";
    s.timer = 8;
    s.target = null;
    state.message = "상어가 도망간다";
  }
}

function updateShark(state: GameState, dt: number, rand: () => number) {
  const s = state.shark;
  const [cx, cy] = raftCenter(state);
  s.timer -= dt;

  if (s.mode === "dead") {
    if (s.timer <= 0) Object.assign(s, newShark(), { x: cx, y: cy - 15 });
    return;
  }

  if (s.mode === "circle" || s.mode === "flee") {
    const radius = Math.sqrt(state.raft.size) + (s.mode === "flee" ? 6 : 3);
    s.angle += dt * 0.5;
    moveToward(s, cx + Math.cos(s.angle) * radius, cy + Math.sin(s.angle) * radius, 4 * dt);
    if (s.timer <= 0) {
      const edges = [...state.raft.keys()].filter((k) => isEdge(state, k));
      if (edges.length) {
        s.mode = "attack";
        s.target = edges[Math.floor(rand() * edges.length)];
        s.biteTimer = SHARK_BITE_INTERVAL;
        state.message = "상어가 뗏목을 노린다! (스페이스로 공격)";
      }
    }
    return;
  }

  // attack
  if (!s.target || !state.raft.has(s.target)) {
    s.mode = "circle";
    s.timer = SHARK_ATTACK_INTERVAL;
    return;
  }
  const [tx, ty] = parseKey(s.target);
  const near = moveToward(s, tx + 0.5, ty + 0.5, 3 * dt, 0.6);
  if (!near) return;
  s.biteTimer -= dt;
  if (s.biteTimer > 0) return;
  s.biteTimer = SHARK_BITE_INTERVAL;
  const hp = (state.raft.get(s.target) ?? 0) - 1;
  if (hp > 0) {
    state.raft.set(s.target, hp);
    return;
  }
  state.raft.delete(s.target);
  state.message = "뗏목 한 칸이 부서졌다!";
  s.mode = "circle";
  s.timer = SHARK_ATTACK_INTERVAL;
  s.target = null;
  if (state.raft.size === 0) {
    state.over = true;
    state.message = "뗏목이 모두 부서졌다...";
  } else if (!onRaft(state, state.player.x, state.player.y)) {
    rescuePlayer(state);
  }
}

// 발밑 칸이 부서지면 가장 가까운 뗏목 칸으로 옮긴다
function rescuePlayer(state: GameState) {
  let best: [number, number] | null = null;
  let bestD = Infinity;
  for (const k of state.raft.keys()) {
    const [x, y] = parseKey(k);
    const d = Math.hypot(x + 0.5 - state.player.x, y + 0.5 - state.player.y);
    if (d < bestD) { bestD = d; best = [x + 0.5, y + 0.5]; }
  }
  if (best) [state.player.x, state.player.y] = best;
}

function moveToward(s: Shark, x: number, y: number, step: number, stopAt = 0) {
  const dist = Math.hypot(x - s.x, y - s.y);
  if (dist <= stopAt + step) return true;
  s.x += ((x - s.x) / dist) * step;
  s.y += ((y - s.y) / dist) * step;
  return false;
}
