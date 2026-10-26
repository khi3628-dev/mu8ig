// 수상스키 랩 레이스 로직. 렌더링과 분리된 순수 로직이라 테스트할 수 있다.
// 좌표 단위는 미터. 부표(체크포인트)를 순서대로 통과해 3바퀴를 돌면 완주.

export const LAPS = 3;
export const TIME_LIMIT = 180;
export const COUNTDOWN = 3;
export const TRACK_HALF = 18; // 코스 중심선에서 이 거리 밖이면 코스 이탈
export const CHECKPOINT_RADIUS = 22;
export const CATCH_RADIUS = 9;
export const RANK_PRIZE = [1500, 1000, 700, 450, 300, 200];

const MAX_SPEED = 30;
const OFF_TRACK_SPEED = 15;
const BOOST_MULT = 1.4;
const ACCEL = 14;
const BRAKE = 25;
const DRAG = 6;
const TURN_RATE = 2.2;
const BOOST_TIME = 1.5;
const BOOST_RADIUS = 5;
const CATCH_SLOW_TIME = 1;

export interface Point { x: number; y: number }

// 업그레이드로 바뀌는 플레이어 능력치
export interface PlayerStats {
  topSpeed: number;
  turnRate: number;
  catchRadius: number;
}

export const BASE_STATS: PlayerStats = { topSpeed: MAX_SPEED, turnRate: TURN_RATE, catchRadius: CATCH_RADIUS };

export interface Racer {
  name: string;
  color: string;
  isPlayer: boolean;
  x: number;
  y: number;
  heading: number; // 라디안, 0 = +x
  speed: number;
  topSpeed: number; // AI 목표 속도
  laneOffset: number; // AI가 중심선에서 벗어나 달리는 거리
  lap: number;
  next: number; // 다음에 통과할 체크포인트 인덱스
  finishTime: number | null;
  boost: number;
  slow: number;
}

export interface FishSpecies { name: string; emoji: string; value: number; weight: number }

export const FISH: FishSpecies[] = [
  { name: "정어리", emoji: "🐟", value: 30, weight: 50 },
  { name: "고등어", emoji: "🐠", value: 60, weight: 30 },
  { name: "참치", emoji: "🐡", value: 150, weight: 15 },
  { name: "황금 청새치", emoji: "✨", value: 400, weight: 5 },
];

export interface JumpingFish {
  id: number;
  species: number; // FISH 인덱스
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

export interface RaceInput {
  throttle: number; // -1..1
  steer: number; // -1..1
  fish: boolean; // 이번 프레임에 낚시 키를 눌렀는지
}

export interface RaceState {
  stats: PlayerStats;
  time: number; // 출발 신호 이후 경과 시간 (카운트다운 중엔 음수)
  course: Point[];
  boostPads: Point[];
  racers: Racer[]; // [0]이 플레이어
  fish: JumpingFish[];
  caught: number[]; // 잡은 물고기 종 인덱스
  fishTimer: number;
  nextFishId: number;
  message: string;
  messageTimer: number;
  done: boolean;
}

export interface RaceResult {
  rank: number; // 1부터
  finished: boolean;
  time: number;
  prize: number;
  fishCoins: number;
  caught: number[];
  standings: { name: string; isPlayer: boolean; time: number | null }[];
}

const AI_PROFILES = [
  { name: "마르코", color: "#ef4444", topSpeed: 27 },
  { name: "소피아", color: "#f97316", topSpeed: 26 },
  { name: "레오", color: "#22c55e", topSpeed: 25 },
  { name: "아이라", color: "#a855f7", topSpeed: 24 },
  { name: "카이", color: "#0ea5e9", topSpeed: 23 },
];

export function createCourse(): Point[] {
  // 타원에 굴곡을 줘서 단조롭지 않게 한다
  const wobble = [1, 0.85, 1.1, 0.9, 1.05, 0.8, 1.1, 0.95, 1.05, 0.9];
  return wobble.map((f, i) => {
    const a = (i / wobble.length) * Math.PI * 2;
    return { x: Math.cos(a) * 200 * f, y: Math.sin(a) * 120 * f };
  });
}

export function createRace(rand: () => number = Math.random, stats: PlayerStats = BASE_STATS): RaceState {
  const course = createCourse();
  const start = course[0];
  const second = course[1];
  const heading = Math.atan2(second.y - start.y, second.x - start.x);
  // 출발선 뒤쪽으로 2열 그리드 배치
  const back = { x: -Math.cos(heading), y: -Math.sin(heading) };
  const side = { x: -Math.sin(heading), y: Math.cos(heading) };
  const profiles = [{ name: "나", color: "#ffffff", topSpeed: stats.topSpeed }, ...AI_PROFILES];
  const racers: Racer[] = profiles.map((p, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2 === 0 ? -1 : 1;
    return {
      ...p,
      isPlayer: i === 0,
      x: start.x + back.x * (8 + row * 10) + side.x * col * 6,
      y: start.y + back.y * (8 + row * 10) + side.y * col * 6,
      heading,
      speed: 0,
      laneOffset: i === 0 ? 0 : (rand() - 0.5) * 16,
      lap: 0,
      next: 1,
      finishTime: null,
      boost: 0,
      slow: 0,
    };
  });
  const boostPads = course
    .filter((_, i) => i % 2 === 1)
    .map((p, j) => {
      const q = course[(j * 2 + 2) % course.length];
      return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    });
  return {
    stats,
    time: -COUNTDOWN,
    course,
    boostPads,
    racers,
    fish: [],
    caught: [],
    fishTimer: 1,
    nextFishId: 1,
    message: "",
    messageTimer: 0,
    done: false,
  };
}

export function distanceToCourse(course: Point[], x: number, y: number) {
  let best = Infinity;
  for (let i = 0; i < course.length; i++) {
    const a = course[i];
    const b = course[(i + 1) % course.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t)));
  }
  return best;
}

// 순위 계산용 진행도: 통과한 체크포인트 수 + 다음 체크포인트까지의 진척률
export function progress(state: RaceState, r: Racer) {
  const n = state.course.length;
  const passed = r.lap * n + ((r.next - 1 + n) % n);
  const prev = state.course[(r.next - 1 + n) % n];
  const next = state.course[r.next];
  const seg = Math.hypot(next.x - prev.x, next.y - prev.y);
  const frac = 1 - Math.min(1, Math.hypot(next.x - r.x, next.y - r.y) / seg);
  return passed + frac;
}

export function standings(state: RaceState): Racer[] {
  return [...state.racers].sort((a, b) => {
    if (a.finishTime !== null && b.finishTime !== null) return a.finishTime - b.finishTime;
    if (a.finishTime !== null) return -1;
    if (b.finishTime !== null) return 1;
    return progress(state, b) - progress(state, a);
  });
}

function say(state: RaceState, msg: string) {
  state.message = msg;
  state.messageTimer = 2;
}

export function updateRace(state: RaceState, dt: number, input: RaceInput, rand: () => number = Math.random) {
  if (state.done) return;
  state.time += dt;
  state.messageTimer = Math.max(0, state.messageTimer - dt);
  if (state.time < 0) return;

  const player = state.racers[0];
  for (const r of state.racers) {
    if (r.finishTime !== null) {
      r.speed = Math.max(0, r.speed - DRAG * dt); // 완주 후엔 서서히 멈춘다
    } else if (r.isPlayer) {
      steerPlayer(state, r, input, dt);
    } else {
      steerAI(state, r, dt);
    }
    r.x += Math.cos(r.heading) * r.speed * dt;
    r.y += Math.sin(r.heading) * r.speed * dt;
    r.boost = Math.max(0, r.boost - dt);
    r.slow = Math.max(0, r.slow - dt);
    for (const pad of state.boostPads) {
      if (Math.hypot(pad.x - r.x, pad.y - r.y) < BOOST_RADIUS) {
        if (r.isPlayer && r.boost === 0) say(state, "파도 부스트!");
        r.boost = BOOST_TIME;
      }
    }
    checkpoints(state, r);
  }

  updateFish(state, dt, rand);
  if (input.fish) tryCatch(state, player);

  if (player.finishTime !== null || state.time >= TIME_LIMIT) state.done = true;
}

function maxSpeedFor(state: RaceState, r: Racer, base: number) {
  let max = r.boost > 0 ? base * BOOST_MULT : base;
  if (distanceToCourse(state.course, r.x, r.y) > TRACK_HALF) max = Math.min(max, OFF_TRACK_SPEED);
  if (r.slow > 0) max *= 0.6;
  return max;
}

function approachSpeed(r: Racer, target: number, dt: number) {
  if (r.speed < target) r.speed = Math.min(target, r.speed + ACCEL * dt);
  else r.speed = Math.max(target, r.speed - BRAKE * dt);
}

function steerPlayer(state: RaceState, r: Racer, input: RaceInput, dt: number) {
  const grip = Math.min(1, r.speed / 8) + 0.3;
  r.heading += input.steer * state.stats.turnRate * grip * dt;
  const max = maxSpeedFor(state, r, r.topSpeed);
  if (input.throttle > 0) approachSpeed(r, max, dt);
  else if (input.throttle < 0) r.speed = Math.max(0, r.speed - BRAKE * dt);
  else r.speed = Math.max(0, r.speed - DRAG * dt);
  if (r.speed > max) r.speed = Math.max(max, r.speed - BRAKE * dt);
}

function steerAI(state: RaceState, r: Racer, dt: number) {
  const n = state.course.length;
  const target = state.course[r.next];
  const after = state.course[(r.next + 1) % n];
  // 진행 방향의 수직 방향으로 laneOffset 만큼 비켜 달린다
  const dirX = after.x - target.x, dirY = after.y - target.y;
  const len = Math.hypot(dirX, dirY) || 1;
  const tx = target.x - (dirY / len) * r.laneOffset;
  const ty = target.y + (dirX / len) * r.laneOffset;
  const desired = Math.atan2(ty - r.y, tx - r.x);
  let diff = desired - r.heading;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  r.heading += Math.max(-1, Math.min(1, diff * 2)) * TURN_RATE * dt;
  approachSpeed(r, maxSpeedFor(state, r, r.topSpeed), dt);
}

function checkpoints(state: RaceState, r: Racer) {
  if (r.finishTime !== null) return;
  const cp = state.course[r.next];
  if (Math.hypot(cp.x - r.x, cp.y - r.y) > CHECKPOINT_RADIUS) return;
  if (r.next === 0) {
    r.lap += 1;
    if (r.lap >= LAPS) {
      r.finishTime = state.time;
      if (r.isPlayer) say(state, "완주!");
      return;
    }
    if (r.isPlayer) say(state, r.lap === LAPS - 1 ? "마지막 바퀴!" : `${r.lap + 1}바퀴째`);
  }
  r.next = (r.next + 1) % state.course.length;
}

function pickSpecies(rand: () => number) {
  const total = FISH.reduce((s, f) => s + f.weight, 0);
  let roll = rand() * total;
  for (let i = 0; i < FISH.length; i++) {
    roll -= FISH[i].weight;
    if (roll < 0) return i;
  }
  return 0;
}

function updateFish(state: RaceState, dt: number, rand: () => number) {
  for (const f of state.fish) f.life -= dt;
  state.fish = state.fish.filter((f) => f.life > 0);
  state.fishTimer -= dt;
  if (state.fishTimer > 0) return;
  state.fishTimer = 1.5 + rand() * 1.5;
  // 플레이어 앞쪽 구간 코스 주변에 물고기를 띄운다
  const n = state.course.length;
  const player = state.racers[0];
  const a = state.course[player.next];
  const b = state.course[(player.next + 1) % n];
  const t = rand();
  const side = (rand() - 0.5) * 2 * TRACK_HALF;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  state.fish.push({
    id: state.nextFishId++,
    species: pickSpecies(rand),
    x: a.x + (b.x - a.x) * t - ((b.y - a.y) / len) * side,
    y: a.y + (b.y - a.y) * t + ((b.x - a.x) / len) * side,
    life: 2.5,
    maxLife: 2.5,
  });
}

// 근처에서 뛰어오른 물고기를 낚아챈다. 대신 잠깐 감속한다 (레이스 vs 낚시의 트레이드오프)
export function tryCatch(state: RaceState, player: Racer) {
  if (state.time < 0 || player.finishTime !== null) return;
  const near = state.fish
    .map((f) => ({ f, d: Math.hypot(f.x - player.x, f.y - player.y) }))
    .filter(({ d }) => d <= state.stats.catchRadius)
    .sort((a, b) => a.d - b.d)[0];
  if (!near) {
    say(state, "허탕!");
    return;
  }
  state.fish = state.fish.filter((f) => f !== near.f);
  state.caught.push(near.f.species);
  player.slow = CATCH_SLOW_TIME;
  const s = FISH[near.f.species];
  say(state, `${s.emoji} ${s.name} 낚았다! +${s.value}`);
}

export function raceResult(state: RaceState): RaceResult {
  const order = standings(state);
  const player = state.racers[0];
  const rank = order.indexOf(player) + 1;
  const finished = player.finishTime !== null;
  const prize = Math.round(RANK_PRIZE[rank - 1] * (finished ? 1 : 0.5));
  const fishCoins = state.caught.reduce((s, i) => s + FISH[i].value, 0);
  return {
    rank,
    finished,
    time: player.finishTime ?? state.time,
    prize,
    fishCoins,
    caught: [...state.caught],
    standings: order.map((r) => ({ name: r.name, isPlayer: r.isPlayer, time: r.finishTime })),
  };
}
