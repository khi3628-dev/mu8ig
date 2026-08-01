// 봇 AI — 1인 플레이 검증용 9기
//
// 이 파일은 "재미 검증 도구"이지 최종 상품용 AI가 아니다.
// 목표는 단 하나: 경기 시간표(5분 고래 → 8분 접힘 → 10분 고래 → 14분 과부하)에
// 사람이 개입하지 않아도 반응하는 상대를 만들어, 15분 경기감 가설을 측정 가능하게 하는 것.
//
// 봇이 오브젝트를 무시하면 경기 길이 통계 전체가 무의미해지므로, 판단 우선순위의 최상단은
// "지금 열려 있는 오브젝트가 무엇인가"이다.

import { HEROES, NEUTRALS, TIMETABLE } from './config';
import { BASE, LANES, OBJECTIVE_POS, SPAWN, pointOnLane } from './map';
import type { Lane, Team, Unit, Vec2 } from './types';
import { World, dist, norm, pickAutoTarget } from './sim';

const DECISION_INTERVAL = 0.35;
const REPATH_INTERVAL = 1.2;
/** [가정] 문서에 귀환 시간이 없어 8초로 둔다. 천정 고래 버프는 2초 단축(GDD 4.7). */
const RECALL_CHANNEL = 8;

export function runBot(world: World, u: Unit): void {
  const ai = u.ai!;
  ai.decisionIn -= 1 / 20;
  ai.repathIn -= 1 / 20;

  handleRecall(world, u);
  if ((u.scratch.recallUntil as number | undefined) !== undefined) {
    u.moveDir = { x: 0, y: 0 };
    u.targetId = undefined;
    return;
  }

  if (ai.decisionIn <= 0) {
    ai.decisionIn = DECISION_INTERVAL;
    decide(world, u);
  }

  fight(world, u);
  steer(world, u);
}

// ---------------------------------------------------------------------------
// 귀환
// ---------------------------------------------------------------------------

function handleRecall(world: World, u: Unit): void {
  const until = u.scratch.recallUntil as number | undefined;
  if (until === undefined) return;
  // 피해를 받으면 취소
  if (world.time - u.lastCombatAt < 0.6) {
    u.scratch.recallUntil = undefined;
    return;
  }
  if (world.time >= until) {
    u.scratch.recallUntil = undefined;
    u.pos = { ...SPAWN[u.team] };
    u.ai!.path = [];
    u.ai!.repathIn = 0;
  }
}

function startRecall(world: World, u: Unit): void {
  if (u.scratch.recallUntil !== undefined) return;
  const cut = world.time < world.teams[u.team].skyWhaleUntil ? NEUTRALS.SKY_WHALE.recallCut : 0;
  u.scratch.recallUntil = world.time + RECALL_CHANNEL - cut;
}

// ---------------------------------------------------------------------------
// 판단
// ---------------------------------------------------------------------------

function decide(world: World, u: Unit): void {
  const ai = u.ai!;
  const hpRatio = u.stats.hp / u.stats.maxHp;
  const enemies = nearbyEnemyHeroes(world, u, 14);
  const allies = nearbyAllyHeroes(world, u, 14);

  // 1. 생존
  if (hpRatio < 0.3 && enemies.length > 0) {
    ai.intent = 'RETREAT';
    ai.goal = { ...BASE[u.team] };
    return;
  }
  if (hpRatio < 0.35 && enemies.length === 0) {
    const needsShop = u.gold > 900;
    if (needsShop || hpRatio < 0.25) {
      ai.intent = 'RECALL';
      ai.goal = { ...BASE[u.team] };
      startRecall(world, u);
      return;
    }
  }
  if (u.gold > 2500 && enemies.length === 0 && hpRatio > 0.5) {
    ai.intent = 'RECALL';
    ai.goal = { ...BASE[u.team] };
    startRecall(world, u);
    return;
  }

  // 2. 오브젝트 — 경기 시간표가 봇 행동의 최상위 규칙
  const objective = activeObjective(world, u);
  if (objective) {
    ai.intent = 'OBJECTIVE';
    ai.goal = objective;
    return;
  }

  // 3. 방어: 아군 구조물이 압박받는가
  const threatened = threatenedStructure(world, u);
  if (threatened) {
    ai.intent = 'DEFEND';
    ai.goal = { ...threatened.pos };
    return;
  }

  // 4. 합류 압박.
  //    오브젝트를 먹었거나(버프 보유), 적이 2명 이상 죽었거나, 과부하 이후에는 모여서 끝낸다.
  //    이 조건이 없으면 봇은 영원히 라인만 밀고 경기가 끝나지 않는다.
  const buffed = world.time < world.teams[u.team].deepWhaleUntil || world.time < world.teams[u.team].skyWhaleUntil;
  const enemyDown = world.heroes(u.team === 0 ? 1 : 0).filter((h) => !h.alive).length;
  if (buffed || enemyDown >= 2 || world.time >= TIMETABLE.CORE_OVERLOAD) {
    const lane = weakestEnemyLane(world, u);
    const target = pushTarget(world, u, lane);
    if (target) {
      ai.intent = 'SIEGE';
      ai.goal = { ...target.pos };
      return;
    }
  }

  // 5. 정글러는 캠프와 갱킹
  if (ai.homeLane === 'JUNGLE') {
    const gank = gankTarget(world, u);
    if (gank) {
      ai.intent = 'GANK';
      ai.goal = gank;
      return;
    }
    const camp = nearestCamp(world, u);
    if (camp) {
      ai.intent = 'JUNGLE';
      ai.goal = { ...camp.pos };
      return;
    }
  }

  // 6. 라인전
  const lane = (ai.homeLane === 'JUNGLE' ? 'MID' : ai.homeLane) as Lane;
  const push = pushTarget(world, u, lane);
  ai.intent = 'LANE';
  ai.goal = push ? { ...push.pos } : laneFrontier(world, u, lane);
  void allies;
}

/**
 * 지금 다툴 만한 오브젝트가 있는가.
 *
 * 중요: "살아 있으면 무조건 간다"로 만들면 봇 10기가 고래 앞에 상주하며 라인을 버려
 * 경기가 30분씩 늘어진다. 실제로 첫 측정에서 그렇게 됐다.
 * 그래서 (1) 생성 직후 일정 창, (2) 거리, (3) 생존 아군 수 세 조건을 모두 요구한다.
 */
const OBJECTIVE_CONTEST_WINDOW = 45;

function activeObjective(world: World, u: Unit): Vec2 | null {
  const aliveAllies = world.heroes(u.team).filter((h) => h.alive).length;
  if (aliveAllies < 3) return null;

  const inWindow = (o: Unit) => world.time - ((o.scratch.spawnedAt as number) ?? 0) <= OBJECTIVE_CONTEST_WINDOW;

  const deep = [...world.units.values()].find((o) => o.tag === 'DEEP_WHALE' && o.alive);
  if (deep && inWindow(deep) && dist(u.pos, OBJECTIVE_POS.DEEP_WHALE) < 55) return { ...OBJECTIVE_POS.DEEP_WHALE };

  const sky = [...world.units.values()].find((o) => o.tag === 'SKY_WHALE' && o.alive);
  if (sky && inWindow(sky) && dist(u.pos, sky.pos) < 45) return { ...sky.pos };

  const scout = [...world.units.values()].find((o) => o.tag === 'SCOUT_NODE' && o.alive);
  if (scout && u.ai!.homeLane === 'JUNGLE' && dist(u.pos, OBJECTIVE_POS.SCOUT_NODE) < 30) return { ...OBJECTIVE_POS.SCOUT_NODE };

  return null;
}

/** 가장 무너진 적 라인 — 압박은 약한 쪽으로 */
function weakestEnemyLane(world: World, u: Unit): Lane {
  const foe: Team = u.team === 0 ? 1 : 0;
  let best: Lane = 'MID';
  let bestScore = Infinity;
  for (const lane of LANES) {
    const structures = [...world.units.values()].filter((s) => s.alive && s.team === foe && s.kind === 'TURRET' && s.lane === lane);
    const score = structures.reduce((a, s) => a + s.stats.hp, 0) + structures.length * 1500;
    if (score < bestScore) {
      bestScore = score;
      best = lane;
    }
  }
  return best;
}

function threatenedStructure(world: World, u: Unit): Unit | null {
  for (const s of world.units.values()) {
    if (s.team !== u.team || (s.kind !== 'TURRET' && s.kind !== 'CORE') || !s.alive) continue;
    if (s.stats.hp / s.stats.maxHp > 0.6) continue;
    const enemiesNear = [...world.units.values()].some((o) => o.alive && o.team !== u.team && o.kind === 'HERO' && dist(o.pos, s.pos) < 12);
    if (!enemiesNear) continue;
    if (dist(u.pos, s.pos) > 45) continue;
    return s;
  }
  return null;
}

/** 이 라인에서 다음으로 부술 적 구조물 */
function pushTarget(world: World, u: Unit, lane: Lane): Unit | null {
  const enemyTeam: Team = u.team === 0 ? 1 : 0;
  const outer = [...world.units.values()].find((s) => s.alive && s.team === enemyTeam && s.kind === 'TURRET' && s.lane === lane && s.structureSlot === 'OUTER');
  if (outer) return outer;
  const inner = [...world.units.values()].find((s) => s.alive && s.team === enemyTeam && s.kind === 'TURRET' && s.lane === lane && s.structureSlot === 'INNER');
  if (inner) return inner;
  if (world.coreVulnerable(enemyTeam)) {
    return [...world.units.values()].find((s) => s.alive && s.team === enemyTeam && s.kind === 'CORE') ?? null;
  }
  // 이 라인은 끝났다. 다른 라인으로.
  for (const other of LANES) {
    if (other === lane) continue;
    const t = [...world.units.values()].find((s) => s.alive && s.team === enemyTeam && s.kind === 'TURRET' && s.lane === other);
    if (t) return t;
  }
  return null;
}

/** 라인 최전선(아군 미니언 선두 부근) */
function laneFrontier(world: World, u: Unit, lane: Lane): Vec2 {
  let best: Unit | null = null;
  let bestT = -1;
  for (const m of world.units.values()) {
    if (m.kind !== 'MINION' || m.team !== u.team || m.lane !== lane || !m.alive) continue;
    if ((m.pathT ?? 0) > bestT) {
      bestT = m.pathT ?? 0;
      best = m;
    }
  }
  if (best) return { ...best.pos };
  return pointOnLane(u.team, lane, 0.35);
}

function gankTarget(world: World, u: Unit): Vec2 | null {
  for (const lane of LANES) {
    const allies = [...world.units.values()].filter((o) => o.alive && o.kind === 'HERO' && o.team === u.team && o.lane === lane);
    const foes = [...world.units.values()].filter((o) => o.alive && o.kind === 'HERO' && o.team !== u.team && o.lane === lane);
    if (!allies.length || !foes.length) continue;
    const weak = foes.find((f) => f.stats.hp / f.stats.maxHp < 0.55);
    if (weak && dist(u.pos, weak.pos) < 40) return { ...weak.pos };
  }
  return null;
}

function nearestCamp(world: World, u: Unit): Unit | null {
  let best: Unit | null = null;
  let bestD = Infinity;
  const foe: Team = u.team === 0 ? 1 : 0;
  for (const c of world.units.values()) {
    if (c.kind !== 'CAMP' || !c.alive) continue;
    // 자기 진영 정글 우선. 기준은 어느 직조핵에 더 가까운가(회전 대칭이 보장된다).
    const own = dist(c.pos, BASE[u.team]) < dist(c.pos, BASE[foe]);
    const d = dist(u.pos, c.pos) * (own ? 1 : 1.8);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// 교전
// ---------------------------------------------------------------------------

function fight(world: World, u: Unit): void {
  const enemyHeroes = nearbyEnemyHeroes(world, u, u.stats.attackRange + 6);
  const ai = u.ai!;

  // 공격 대상 선택
  const mode = enemyHeroes.length && ai.intent !== 'RETREAT' && ai.intent !== 'RECALL' ? 'HERO_PRIORITY' : 'MINION_PRIORITY';
  const target = pickAutoTarget(world, u, mode);
  u.targetId = target?.id;

  if (ai.intent === 'RETREAT' || ai.intent === 'RECALL') return;

  // 스킬: 사거리 안 적 영웅 우선, 없으면 오브젝트/구조물/미니언
  const primary = enemyHeroes[0] ?? target ?? null;
  if (!primary) return;
  const d = dist(u.pos, primary.pos);

  const useOnNonHero = primary.kind !== 'HERO';
  for (const slot of ['R', 'Q', 'W', 'E'] as const) {
    if ((u.skillLevels[slot] ?? 0) <= 0) continue;
    if ((u.cooldowns[slot] ?? 0) > 0) continue;
    if (useOnNonHero && (slot === 'R' || slot === 'E')) continue; // 궁극기·이동기는 영웅 상대로만
    const range = abilityRange(u, slot);
    if (d > range) continue;
    // 지원형은 아군 대상
    if (u.heroId === 'YEONHWA' && (slot === 'W' || slot === 'R')) {
      const hurt = nearbyAllyHeroes(world, u, 7).find((a) => a.stats.hp / a.stats.maxHp < 0.65);
      if (!hurt && slot === 'W') continue;
      world.cast(u, slot, u.pos, hurt?.id);
      continue;
    }
    world.cast(u, slot, primary.pos, primary.id);
  }
}

function abilityRange(u: Unit, slot: 'Q' | 'W' | 'E' | 'R'): number {
  if (!u.heroId) return 5;
  return HEROES[u.heroId].abilities[slot].range ?? 5;
}

// ---------------------------------------------------------------------------
// 이동
// ---------------------------------------------------------------------------

function steer(world: World, u: Unit): void {
  const ai = u.ai!;
  if (!ai.goal) {
    u.moveDir = { x: 0, y: 0 };
    return;
  }

  // 사거리 안에 목표가 있으면 멈춘다
  const target = u.targetId ? world.units.get(u.targetId) : null;
  if (target && target.alive && ai.intent !== 'RETREAT' && ai.intent !== 'RECALL') {
    const stopAt = u.stats.attackRange + u.radius + target.radius - 0.3;
    const d = dist(u.pos, target.pos);
    if (d <= stopAt) {
      // 포탑 아래 다이브 회피
      if (underEnemyTurret(world, u) && !alliedMinionsNear(world, u)) {
        moveAway(world, u, BASE[u.team]);
        return;
      }
      u.moveDir = { x: 0, y: 0 };
      return;
    }
    if (d < 12) {
      u.moveDir = norm({ x: target.pos.x - u.pos.x, y: target.pos.y - u.pos.y });
      return;
    }
  }

  if (ai.intent === 'RETREAT' && underEnemyTurret(world, u)) {
    moveAway(world, u, BASE[u.team]);
    return;
  }

  if (ai.repathIn <= 0 || ai.path.length === 0) {
    ai.repathIn = REPATH_INTERVAL;
    ai.path = world.nav.findPath(u.pos, ai.goal);
    ai.pathIndex = 0;
  }

  while (ai.pathIndex < ai.path.length && dist(u.pos, ai.path[ai.pathIndex]) < 1.6) ai.pathIndex++;
  if (ai.pathIndex >= ai.path.length) {
    u.moveDir = { x: 0, y: 0 };
    return;
  }
  const wp = ai.path[ai.pathIndex];
  u.moveDir = norm({ x: wp.x - u.pos.x, y: wp.y - u.pos.y });
}

function moveAway(world: World, u: Unit, toward: Vec2): void {
  const ai = u.ai!;
  ai.path = world.nav.findPath(u.pos, toward);
  ai.pathIndex = 0;
  ai.repathIn = REPATH_INTERVAL;
  if (ai.path.length) u.moveDir = norm({ x: ai.path[0].x - u.pos.x, y: ai.path[0].y - u.pos.y });
  else u.moveDir = norm({ x: toward.x - u.pos.x, y: toward.y - u.pos.y });
}

function underEnemyTurret(world: World, u: Unit): boolean {
  for (const t of world.units.values()) {
    if (!t.alive || t.kind !== 'TURRET' || t.team === u.team) continue;
    if (dist(u.pos, t.pos) < t.stats.attackRange) return true;
  }
  return false;
}

function alliedMinionsNear(world: World, u: Unit): boolean {
  let n = 0;
  for (const m of world.units.values()) {
    if (m.alive && m.kind === 'MINION' && m.team === u.team && dist(u.pos, m.pos) < 7) n++;
  }
  return n >= 2;
}

function nearbyEnemyHeroes(world: World, u: Unit, range: number): Unit[] {
  const out: Unit[] = [];
  for (const o of world.units.values()) {
    if (!o.alive || o.kind !== 'HERO' || o.team === u.team) continue;
    if (dist(u.pos, o.pos) <= range) out.push(o);
  }
  return out.sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos));
}

function nearbyAllyHeroes(world: World, u: Unit, range: number): Unit[] {
  const out: Unit[] = [];
  for (const o of world.units.values()) {
    if (!o.alive || o.kind !== 'HERO' || o.team !== u.team || o.id === u.id) continue;
    if (dist(u.pos, o.pos) <= range) out.push(o);
  }
  return out;
}
