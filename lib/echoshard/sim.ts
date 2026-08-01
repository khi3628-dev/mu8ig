// 에코샤드 프로토타입 — 20Hz 고정 틱 시뮬레이션
//
// GDD 4.1 서버 권위 전투 순서를 그대로 따른다:
//   입력 수신 → 상태 유효성 검사 → 이동/충돌 → 스킬 발동 → 투사체 이동 → 적중 판정
//   → 피해/회복 → 사망 → 목표/보상 → 스냅샷
// 온라인 대전은 범위에서 제외했으므로 "스냅샷 전송" 단계는 렌더러가 직접 읽는 것으로 대체한다.
//
// 결정성: 모든 난수는 시드 RNG에서만 나온다(GDD 4.1 "서버만 RNG 시드를 생성한다").
// 같은 시드 + 같은 입력 = 같은 결과. 배치 시뮬레이션의 신뢰도가 여기에 걸려 있다.

import {
  CC,
  CENTER,
  DEFAULT_CORE_SHIELD_MODE,
  DT,
  HEROES,
  ITEMS,
  MAX_LEVEL,
  MAX_SKILL_LEVEL,
  MINION,
  MINION_SCALING,
  MINION_STATS,
  MOVE_HARD_CAP,
  MOVE_SOFT_CAP,
  NEUTRALS,
  PASSIVE_GOLD_EARLY,
  PASSIVE_GOLD_LATE,
  PASSIVE_GOLD_START_AT,
  REWARDS,
  ROLE_LANE,
  STRUCTURE,
  TIMETABLE,
  ULT_LEVEL_UNLOCK,
  VISION,
  XP_SHARE_RADIUS,
  ASSIST_WINDOW,
  assistShare,
  cooldownWithHaste,
  killBounty,
  mitigation,
  respawnTime,
  xpToNext,
  type CoreShieldMode,
} from './config';
import { Battlefield, BASE, CAMPS, FOLD_ZONES, LANES, Navigator, OBJECTIVE_POS, SPAWN, TURRET_T, pointOnLane } from './map';
import type { CcKind, DamageType, GroundZone, Lane, MatchEvent, MatchStats, Projectile, Stats, Team, TeamState, Unit, Vec2 } from './types';
import { castAbility, onAbilityHit, onBasicAttackHit, tickHeroPassives } from './abilities';
import { runBot } from './ai';

// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
export const norm = (v: Vec2): Vec2 => {
  const l = Math.hypot(v.x, v.y);
  return l < 1e-6 ? { x: 0, y: 0 } : { x: v.x / l, y: v.y / l };
};
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const scale = (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s });

export const enemyOf = (t: Team): Team => (t === 0 ? 1 : 0);

export interface WorldOptions {
  seed: number;
  /** 플레이어가 조종할 영웅. null이면 봇 대 봇(배치 시뮬레이션용) */
  playerHero: string | null;
  playerTeam: Team;
  coreShieldMode: CoreShieldMode;
  /** 항복 허용. 경기 길이 통계를 왜곡할 수 있어 기본 비활성 */
  allowSurrender: boolean;
  /** 세계 접힘 비활성화 — 접힘의 효과를 A/B로 측정하기 위한 실험 플래그 */
  foldEnabled: boolean;
}

export const DEFAULT_OPTIONS: WorldOptions = {
  seed: 1,
  playerHero: 'GAON',
  playerTeam: 0,
  coreShieldMode: DEFAULT_CORE_SHIELD_MODE,
  allowSurrender: false,
  foldEnabled: true,
};

interface DamageOpts {
  type: DamageType;
  /** 스킬 표기용 */
  label?: string;
  /** 구조물 피해 배수 등 별도 배수 */
  mult?: number;
  /** 관통 무시하고 이미 계산된 값이면 true */
  preMitigated?: boolean;
  isBasicAttack?: boolean;
}

export class World {
  field = new Battlefield();
  nav: Navigator;
  rng: () => number;
  opts: WorldOptions;

  units = new Map<number, Unit>();
  projectiles: Projectile[] = [];
  zones: GroundZone[] = [];
  /** 가온 E 등 일시적 벽 */
  barriers: { a: Vec2; b: Vec2; expiresAt: number; team: Team; hits: number }[] = [];

  time = 0;
  tick = 0;
  over = false;
  winner: Team | null = null;
  endReason = '';
  playerId: number | null = null;

  teams: [TeamState, TeamState] = [emptyTeamState(), emptyTeamState()];
  events: MatchEvent[] = [];

  private nextId = 1;
  private waveCount = 0;
  private nextWaveAt = TIMETABLE.FIRST_WAVE;
  private campRespawn = new Map<number, number>();
  private skyWhaleNextAt: number = NEUTRALS.SKY_WHALE.spawnAt;
  private skyWhaleSpawns = 0;
  /** 현재 천정 고래가 있는 지점 (봇 판단·렌더러 공용) */
  skyWhaleSite: Vec2 = { ...OBJECTIVE_POS.SKY_WHALE_A };
  private deepWhaleSpawned = false;
  private scoutNextAt: number = NEUTRALS.SCOUT_NODE.spawnAt;
  private overloadSteps = 0;

  /** 렌더러용 시야 캐시 */
  visionGrid: [Uint8Array, Uint8Array] = [new Uint8Array(0), new Uint8Array(0)];
  private visionCell = 2;
  private visionDim = 0;

  /** 통계 */
  private goldDiffAt8 = 0;
  private fightsBeforeFold = 0;
  private fightsAfterFold = 0;
  private goldAt8Recorded = false;
  private leaderAt8: Team | null = null;

  constructor(options: Partial<WorldOptions> = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...options };
    this.rng = mulberry32(this.opts.seed);
    this.nav = new Navigator(this.field);
    this.visionDim = Math.ceil(120 / this.visionCell);
    this.visionGrid = [new Uint8Array(this.visionDim * this.visionDim), new Uint8Array(this.visionDim * this.visionDim)];
    this.setup();
  }

  // -------------------------------------------------------------------------
  // 초기 배치
  // -------------------------------------------------------------------------

  private setup(): void {
    for (const team of [0, 1] as Team[]) {
      this.spawnStructures(team);
      this.spawnHeroes(team);
    }
    this.log('MATCH_ACTIVE');
  }

  private spawnStructures(team: Team): void {
    for (const lane of LANES) {
      for (const slot of ['OUTER', 'INNER'] as const) {
        const t = team === 0 ? TURRET_T[slot] : 1 - TURRET_T[slot];
        const pos = pointOnLane(0, lane, t);
        const spec = STRUCTURE[slot];
        this.addUnit({
          kind: 'TURRET',
          team,
          pos,
          name: `${lane} ${slot === 'OUTER' ? '외곽' : '내곽'} 포탑`,
          radius: 1.6,
          immobile: true,
          structureSlot: slot,
          lane,
          stats: baseStats({ hp: spec.hp, ad: spec.ad, defense: spec.defense, resist: spec.resist, attackRange: spec.range, attackSpeed: spec.attackSpeed, moveSpeed: 0 }),
        });
      }
    }
    this.addUnit({
      kind: 'CORE',
      team,
      pos: { ...BASE[team] },
      name: '직조핵',
      radius: 3,
      immobile: true,
      structureSlot: 'CORE',
      stats: baseStats({ hp: STRUCTURE.CORE.hp, ad: 0, defense: STRUCTURE.CORE.defense, resist: STRUCTURE.CORE.resist, attackRange: 0, attackSpeed: 0, moveSpeed: 0 }),
    });
  }

  private spawnHeroes(team: Team): void {
    const ids = ['GAON', 'NERU', 'SAEL', 'IDO', 'YEONHWA'];
    for (const heroId of ids) {
      const spec = HEROES[heroId];
      const lane = ROLE_LANE[spec.role];
      const u = this.addUnit({
        kind: 'HERO',
        team,
        pos: { ...SPAWN[team] },
        name: spec.name,
        radius: 0.9,
        heroId,
        lane,
        stats: heroStatsAtLevel(heroId, 1),
      });
      u.ai = { intent: 'LANE', goal: null, path: [], pathIndex: 0, repathIn: 0, decisionIn: 0, recallingFor: 0, homeLane: lane };
      // 레벨 1에도 스킬 1개는 배운 상태로 시작한다. 이게 없으면 첫 웨이브를 아무 스킬 없이 맞는다.
      u.skillLevels = { Q: 1, W: 0, E: 0, R: 0 };
      if (this.opts.playerHero === heroId && team === this.opts.playerTeam && this.playerId === null) {
        this.playerId = u.id;
        u.ai = undefined;
      }
    }
  }

  private addUnit(init: Partial<Unit> & { kind: Unit['kind']; team: Team; pos: Vec2; name: string; stats: Stats }): Unit {
    const u: Unit = {
      id: this.nextId++,
      kind: init.kind,
      team: init.team,
      pos: { ...init.pos },
      moveDir: { x: 0, y: 0 },
      facing: { x: 1, y: 0 },
      radius: init.radius ?? 0.8,
      stats: init.stats,
      alive: true,
      respawnIn: 0,
      level: init.level ?? 1,
      xp: 0,
      gold: init.kind === 'HERO' ? 500 : 0,
      netWorth: 0,
      statuses: [],
      marks: new Map(),
      shields: [],
      cooldowns: {},
      skillLevels: {},
      attackCooldown: 0,
      castLock: 0,
      heroId: init.heroId,
      lane: init.lane,
      name: init.name,
      items: [],
      tag: init.tag,
      pathT: init.pathT ?? 0,
      killStreak: 0,
      deathStreak: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      recentDamagers: new Map(),
      lastCombatAt: -99,
      ai: init.ai,
      expiresAt: init.expiresAt,
      structureSlot: init.structureSlot,
      immobile: init.immobile,
      scratch: {},
    };
    this.units.set(u.id, u);
    return u;
  }

  // -------------------------------------------------------------------------
  // 조회 헬퍼
  // -------------------------------------------------------------------------

  get player(): Unit | null {
    return this.playerId === null ? null : this.units.get(this.playerId) ?? null;
  }

  allUnits(): Unit[] {
    return [...this.units.values()];
  }

  heroes(team?: Team): Unit[] {
    return this.allUnits().filter((u) => u.kind === 'HERO' && (team === undefined || u.team === team));
  }

  livingEnemiesOf(u: Unit): Unit[] {
    return this.allUnits().filter((o) => o.alive && o.team !== u.team && o.kind !== 'WARD');
  }

  isDisabled(u: Unit): boolean {
    return u.statuses.some((s) => s.kind === 'STUN' || s.kind === 'AIRBORNE' || s.kind === 'SUPPRESS');
  }
  isRooted(u: Unit): boolean {
    return this.isDisabled(u) || u.statuses.some((s) => s.kind === 'ROOT');
  }
  isSilenced(u: Unit): boolean {
    return this.isDisabled(u) || u.statuses.some((s) => s.kind === 'SILENCE');
  }

  /** GDD 4.2 — 이동속도 캡과 둔화 최소치 */
  moveSpeedOf(u: Unit): number {
    if (this.isRooted(u)) return 0;
    let ms = u.stats.moveSpeed;
    const buffs = this.teams[u.team];
    if (this.time < buffs.skyWhaleUntil) ms *= 1 + NEUTRALS.SKY_WHALE.moveBonus;
    // 가장 강한 둔화만 적용 (GDD 4.4)
    let strongestSlow = 0;
    for (const s of u.statuses) if (s.kind === 'SLOW') strongestSlow = Math.max(strongestSlow, s.magnitude ?? 0);
    if (strongestSlow > 0) ms = Math.max(CC.SLOW_MIN_MOVE_SPEED, ms * (1 - strongestSlow));
    if (ms > MOVE_SOFT_CAP) ms = MOVE_SOFT_CAP + (ms - MOVE_SOFT_CAP) * 0.5;
    return Math.min(MOVE_HARD_CAP, ms);
  }

  log(code: string, detail?: string): void {
    this.events.push({ t: this.time, code, detail });
  }

  // -------------------------------------------------------------------------
  // 메인 틱
  // -------------------------------------------------------------------------

  step(): void {
    if (this.over) return;
    this.time += DT;
    this.tick++;

    this.runTimetable();
    this.updateStatuses();
    this.updateEconomy();
    this.updateAi();
    this.updateMovement();
    this.updateAttacks();
    this.updateProjectiles();
    this.updateZones();
    this.updateBarriers();
    this.updateRespawns();
    this.updateNeutrals();
    if (this.tick % 4 === 0) this.recomputeVision();
    this.checkEnd();
  }

  // -------------------------------------------------------------------------
  // 3.3 경기 시간표
  // -------------------------------------------------------------------------

  private runTimetable(): void {
    if (this.time >= this.nextWaveAt) {
      this.spawnWave();
      this.nextWaveAt += MINION.WAVE_INTERVAL;
    }
    if (this.opts.foldEnabled && !this.field.folded && this.time >= TIMETABLE.WORLD_FOLD_STAGE_1) {
      this.applyWorldFold();
    }
    if (this.time >= TIMETABLE.CORE_OVERLOAD) {
      const steps = 1 + Math.floor((this.time - TIMETABLE.CORE_OVERLOAD) / STRUCTURE.OVERLOAD_STEP_INTERVAL);
      if (steps > this.overloadSteps) {
        this.overloadSteps = steps;
        this.log('CORE_OVERLOAD', `단계 ${steps}`);
      }
    }
    if (this.time >= TIMETABLE.WORLD_FOLD_FINAL) {
      // 최종 접힘: 모든 외곽 구조물 방어력 0
      for (const u of this.units.values()) {
        if (u.structureSlot === 'OUTER') {
          u.stats.defense = 0;
          u.stats.resist = 0;
        }
      }
    }
  }

  /** GDD 3.4 — 세계 접힘 */
  private applyWorldFold(): void {
    this.field.applyFold();
    this.nav.rebuild();
    // 벽 위 유닛은 가장 가까운 안전 지점으로 밀어낸다
    for (const u of this.units.values()) {
      if (!u.alive || u.immobile) continue;
      if (!this.field.isFree(u.pos, u.radius)) u.pos = this.field.nearestFree(u.pos, u.radius);
    }
    // 봇 경로 재계산 (부록 C: 폐쇄된 링크를 참조하지 않는다)
    for (const u of this.units.values()) if (u.ai) u.ai.repathIn = 0;
    this.log('WORLD_FOLD_STAGE_1', '외곽 벽 4곳 개방');
  }

  // -------------------------------------------------------------------------
  // 미니언 웨이브
  // -------------------------------------------------------------------------

  private spawnWave(): void {
    this.waveCount++;
    const late = this.time >= TIMETABLE.WORLD_FOLD_STAGE_1;
    const siegeEvery = late ? MINION.SIEGE_EVERY_LATE : MINION.SIEGE_EVERY_EARLY;
    const withSiege = this.waveCount % siegeEvery === 0;
    const scaled = this.time >= MINION_SCALING.at;

    for (const team of [0, 1] as Team[]) {
      for (const lane of LANES) {
        const origin = pointOnLane(team, lane, 0.06);
        const kinds: ('MELEE' | 'RANGED' | 'SIEGE')[] = [
          ...Array<'MELEE'>(MINION.MELEE_PER_WAVE).fill('MELEE'),
          ...Array<'RANGED'>(MINION.RANGED_PER_WAVE).fill('RANGED'),
        ];
        if (withSiege) kinds.push('SIEGE');
        for (const k of kinds) {
          const s = MINION_STATS[k];
          const jitter = { x: (this.rng() - 0.5) * 2.4, y: (this.rng() - 0.5) * 2.4 };
          const boosted = this.time < this.teams[team].deepWhaleUntil;
          const hpMult = (scaled ? MINION_SCALING.hpMult : 1) * (boosted ? 1.3 : 1);
          const adMult = (scaled ? MINION_SCALING.adMult : 1) * (boosted ? 1.25 : 1);
          this.addUnit({
            kind: 'MINION',
            team,
            pos: this.field.nearestFree(add(origin, jitter), 0.5),
            name: k,
            radius: 0.55,
            lane,
            tag: k,
            pathT: 0.06,
            stats: baseStats({
              hp: s.hp * hpMult,
              ad: s.ad * adMult,
              defense: s.defense,
              resist: s.resist,
              attackRange: s.range,
              attackSpeed: s.attackSpeed,
              moveSpeed: s.moveSpeed,
            }),
          });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // 경제 (GDD 4.5)
  // -------------------------------------------------------------------------

  private updateEconomy(): void {
    if (this.time < PASSIVE_GOLD_START_AT) return;
    const rate = this.time >= TIMETABLE.WORLD_FOLD_STAGE_1 ? PASSIVE_GOLD_LATE : PASSIVE_GOLD_EARLY;
    for (const u of this.units.values()) {
      if (u.kind !== 'HERO') continue;
      u.gold += rate * DT;
    }
    if (!this.goldAt8Recorded && this.time >= TIMETABLE.WORLD_FOLD_STAGE_1) {
      this.goldAt8Recorded = true;
      const nw0 = this.teamNetWorth(0);
      const nw1 = this.teamNetWorth(1);
      this.goldDiffAt8 = nw0 - nw1;
      this.leaderAt8 = nw0 === nw1 ? null : nw0 > nw1 ? 0 : 1;
    }
  }

  teamNetWorth(team: Team): number {
    let sum = 0;
    for (const u of this.units.values()) {
      if (u.kind === 'HERO' && u.team === team) sum += u.gold + u.netWorth;
    }
    return sum;
  }

  /** GDD 6.1 — 자동 구매는 추천 빌드만. 기지 안에서만 구매 가능 */
  tryShop(u: Unit): void {
    if (!u.heroId) return;
    if (dist(u.pos, BASE[u.team]) > 12) return;
    const build = HEROES[u.heroId].build;
    for (const itemId of build) {
      if (u.items.includes(itemId)) continue;
      const item = ITEMS[itemId];
      if (u.gold >= item.cost) {
        u.gold -= item.cost;
        u.netWorth += item.cost;
        u.items.push(itemId);
        this.applyItem(u, itemId);
      }
      return; // 빌드 순서대로 한 번에 하나만
    }
  }

  private applyItem(u: Unit, itemId: string): void {
    const it = ITEMS[itemId];
    u.stats.ad += it.ad ?? 0;
    u.stats.sp += it.sp ?? 0;
    u.stats.maxHp += it.hp ?? 0;
    u.stats.hp += it.hp ?? 0;
    u.stats.defense += it.defense ?? 0;
    u.stats.resist += it.resist ?? 0;
    u.stats.haste += it.haste ?? 0;
    u.stats.penetration += it.penetration ?? 0;
    u.stats.attackSpeed += it.attackSpeed ?? 0;
    u.stats.moveSpeed += it.moveSpeed ?? 0;
  }

  // -------------------------------------------------------------------------
  // 상태이상·쿨타임
  // -------------------------------------------------------------------------

  private updateStatuses(): void {
    for (const u of this.units.values()) {
      for (const key of Object.keys(u.cooldowns)) {
        if (u.cooldowns[key] > 0) u.cooldowns[key] = Math.max(0, u.cooldowns[key] - DT);
      }
      if (u.castLock > 0) u.castLock = Math.max(0, u.castLock - DT);
      if (u.attackCooldown > 0) u.attackCooldown = Math.max(0, u.attackCooldown - DT);
      if (u.statuses.length) {
        for (const s of u.statuses) s.remaining -= DT;
        u.statuses = u.statuses.filter((s) => s.remaining > 0);
      }
      if (u.shields.length) u.shields = u.shields.filter((s) => s.expiresAt > this.time && s.amount > 0);
      if (u.marks.size) {
        for (const [k, m] of u.marks) if (m.expiresAt <= this.time) u.marks.delete(k);
      }
      for (const [id, t] of u.recentDamagers) if (this.time - t > ASSIST_WINDOW) u.recentDamagers.delete(id);

      if (u.kind === 'HERO' && u.alive) {
        // 레벨업
        while (u.level < MAX_LEVEL && u.xp >= xpToNext(u.level)) {
          u.xp -= xpToNext(u.level);
          u.level++;
          this.onLevelUp(u);
        }
        // 비전투 회복 [가정]: 문서에 회복 규칙이 없어 기지 밖 소량 재생을 둔다
        if (this.time - u.lastCombatAt > 6 && u.stats.hp < u.stats.maxHp) {
          u.stats.hp = Math.min(u.stats.maxHp, u.stats.hp + u.stats.maxHp * 0.012 * DT);
        }
        if (dist(u.pos, BASE[u.team]) < 10) {
          u.stats.hp = Math.min(u.stats.maxHp, u.stats.hp + u.stats.maxHp * 0.22 * DT);
          this.tryShop(u);
        }
        tickHeroPassives(this, u);
      }
    }
  }

  private onLevelUp(u: Unit): void {
    if (!u.heroId) return;
    const spec = HEROES[u.heroId];
    const b = spec.base;
    const gainHp = b.hpPerLevel;
    u.stats.maxHp += gainHp;
    u.stats.hp += gainHp;
    u.stats.ad += b.adPerLevel;
    u.stats.defense += b.defensePerLevel;
    u.stats.resist += b.resistPerLevel;
    // 스킬 포인트 자동 배분 [가정]: 프로토타입은 R > Q > W > E 순으로 자동 투자
    const order = ULT_LEVEL_UNLOCK.includes(u.level) ? ['R', 'Q', 'W', 'E'] : ['Q', 'W', 'E', 'R'];
    for (const slot of order) {
      const cap = slot === 'R' ? 2 : MAX_SKILL_LEVEL;
      const canTakeUlt = slot !== 'R' || ULT_LEVEL_UNLOCK.some((l) => u.level >= l);
      if ((u.skillLevels[slot] ?? 0) < cap && canTakeUlt) {
        u.skillLevels[slot] = (u.skillLevels[slot] ?? 0) + 1;
        break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // 이동
  // -------------------------------------------------------------------------

  private updateAi(): void {
    for (const u of this.units.values()) {
      if (!u.alive) continue;
      if (u.kind === 'HERO' && u.ai) runBot(this, u);
      if (u.kind === 'MINION') this.driveMinion(u);
    }
  }

  private driveMinion(u: Unit): void {
    const lane = (u.lane ?? 'MID') as Lane;
    const target = this.pickMinionTarget(u);
    u.targetId = target?.id;
    if (target && dist(u.pos, target.pos) <= u.stats.attackRange + u.radius + target.radius) {
      u.moveDir = { x: 0, y: 0 };
      return;
    }
    if (target && dist(u.pos, target.pos) < 9) {
      u.moveDir = norm({ x: target.pos.x - u.pos.x, y: target.pos.y - u.pos.y });
      return;
    }
    // 라인 전진: 실제로 웨이포인트에 도달했을 때만 진행도를 올린다.
    // (이전 구현은 진행도를 시간으로 올려 미니언이 라인을 이탈했다)
    const wp = pointOnLane(u.team, lane, u.pathT ?? 0);
    const d = { x: wp.x - u.pos.x, y: wp.y - u.pos.y };
    if (Math.hypot(d.x, d.y) < 2) u.pathT = Math.min(1, (u.pathT ?? 0) + 0.04);
    u.moveDir = norm(d);
  }

  private pickMinionTarget(u: Unit): Unit | null {
    let best: Unit | null = null;
    let bestScore = Infinity;
    for (const o of this.units.values()) {
      if (!o.alive || o.team === u.team || o.kind === 'WARD' || o.kind === 'CAMP') continue;
      if (o.kind === 'CORE' && !this.coreVulnerable(o.team)) continue;
      const d = dist(u.pos, o.pos);
      if (d > 11) continue;
      // 우선순위: 나를 때린 영웅 > 미니언 > 영웅 > 구조물
      let pri = 3;
      if (o.kind === 'MINION') pri = 1;
      else if (o.kind === 'HERO') pri = 2;
      const score = pri * 100 + d;
      if (score < bestScore) {
        bestScore = score;
        best = o;
      }
    }
    return best;
  }

  /**
   * 이동은 반드시 같은 스냅샷에서 계산해야 한다.
   *
   * 유닛을 순서대로 이동시키면 뒤 순서 유닛이 앞 유닛의 "이미 갱신된" 위치를 보고 움직이게 된다.
   * 유닛 id는 청 팀이 먼저 발급되므로 이 순차 처리는 적 팀에게 매 틱 50ms짜리 반응 우위를 준다.
   * 실제로 20경기 측정에서 청 승률이 25%로 고정됐고, 진영 승률 49~51%(GDD 1.6)를 만족할 수 없었다.
   */
  private updateMovement(): void {
    const movers: Unit[] = [];
    const next: Vec2[] = [];
    for (const u of this.units.values()) {
      if (!u.alive || u.immobile) continue;
      if (u.castLock > 0 || this.isDisabled(u)) continue;
      const speed = this.moveSpeedOf(u);
      if (speed <= 0) continue;
      const dir = u.moveDir;
      if (Math.abs(dir.x) < 1e-6 && Math.abs(dir.y) < 1e-6) continue;
      const delta = scale(norm(dir), speed * DT);
      if (this.crossesBarrier(u, u.pos, add(u.pos, delta))) continue;
      movers.push(u);
      next.push(this.field.resolveMove(u.pos, delta, u.radius));
    }
    for (let i = 0; i < movers.length; i++) {
      movers[i].pos = next[i];
      movers[i].facing = norm(movers[i].moveDir);
    }

    // 겹침 완화도 동일 스냅샷에서 변위를 모두 누적한 뒤 한 번에 적용한다.
    const list = this.allUnits().filter((u) => u.alive && !u.immobile && u.kind !== 'WARD');
    const shift = new Map<number, Vec2>();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const d = dist(a.pos, b.pos);
        const min = a.radius + b.radius;
        if (d <= 0 || d >= min) continue;
        const push = (min - d) / 2;
        const dir = norm({ x: b.pos.x - a.pos.x, y: b.pos.y - a.pos.y });
        const sa = shift.get(a.id) ?? { x: 0, y: 0 };
        const sb = shift.get(b.id) ?? { x: 0, y: 0 };
        shift.set(a.id, { x: sa.x - dir.x * push, y: sa.y - dir.y * push });
        shift.set(b.id, { x: sb.x + dir.x * push, y: sb.y + dir.y * push });
      }
    }
    for (const u of list) {
      const s = shift.get(u.id);
      if (!s) continue;
      u.pos = this.field.resolveMove(u.pos, s, u.radius);
    }
  }

  private crossesBarrier(u: Unit, from: Vec2, to: Vec2): boolean {
    for (const b of this.barriers) {
      if (b.team === u.team) continue;
      if (segmentsIntersect(from, to, b.a, b.b)) return true;
    }
    return false;
  }

  private updateBarriers(): void {
    this.barriers = this.barriers.filter((b) => b.expiresAt > this.time && b.hits > 0);
  }

  // -------------------------------------------------------------------------
  // 기본 공격 (GDD 3.7 타기팅 우선순위)
  // -------------------------------------------------------------------------

  private updateAttacks(): void {
    for (const u of this.units.values()) {
      if (!u.alive || u.stats.attackSpeed <= 0) continue;
      if (this.isDisabled(u) || u.castLock > 0) continue;
      if (u.attackCooldown > 0) continue;
      const target = u.kind === 'TURRET' ? this.pickTurretTarget(u) : this.units.get(u.targetId ?? -1) ?? null;
      if (!target || !target.alive) continue;
      const range = u.stats.attackRange + u.radius + target.radius;
      if (dist(u.pos, target.pos) > range) continue;
      if (!this.field.lineOfSight(u.pos, target.pos)) continue;
      u.attackCooldown = 1 / Math.min(2.5, u.stats.attackSpeed);
      u.facing = norm({ x: target.pos.x - u.pos.x, y: target.pos.y - u.pos.y });
      const dmgType: DamageType = u.kind === 'HERO' && u.heroId ? 'PHYSICAL' : 'PHYSICAL';
      if (u.stats.attackRange > 3) {
        this.spawnProjectile(u, target.pos, u.stats.ad, dmgType, 'AA', 18);
      } else {
        this.dealDamage(u, target, u.stats.ad, { type: dmgType, isBasicAttack: true, label: 'AA' });
        if (u.kind === 'HERO') onBasicAttackHit(this, u, target);
      }
    }
  }

  /** GDD 4.6 — 포탑은 미니언 우선, 아군 영웅을 공격한 적 영웅으로 전환 */
  private pickTurretTarget(t: Unit): Unit | null {
    let minion: Unit | null = null;
    let hero: Unit | null = null;
    let aggroHero: Unit | null = null;
    for (const o of this.units.values()) {
      if (!o.alive || o.team === t.team) continue;
      if (o.kind !== 'MINION' && o.kind !== 'HERO') continue;
      if (dist(t.pos, o.pos) > t.stats.attackRange) continue;
      if (o.kind === 'MINION' && !minion) minion = o;
      if (o.kind === 'HERO') {
        if (!hero) hero = o;
        if (this.time - o.lastCombatAt < MINION.AGGRO_HOLD && this.recentlyHitAlly(o, t.team)) aggroHero = o;
      }
    }
    return aggroHero ?? minion ?? hero;
  }

  private recentlyHitAlly(attacker: Unit, team: Team): boolean {
    for (const o of this.units.values()) {
      if (o.kind !== 'HERO' || o.team !== team) continue;
      const t = o.recentDamagers.get(attacker.id);
      if (t !== undefined && this.time - t < MINION.AGGRO_HOLD) return true;
    }
    return false;
  }

  spawnProjectile(
    owner: Unit,
    toward: Vec2,
    damage: number,
    type: DamageType,
    slot: Projectile['abilitySlot'],
    speed: number,
    opts: { range?: number; radius?: number; pierce?: boolean; onHit?: string; level?: number } = {},
  ): Projectile {
    const dir = norm({ x: toward.x - owner.pos.x, y: toward.y - owner.pos.y });
    const p: Projectile = {
      id: this.nextId++,
      ownerId: owner.id,
      team: owner.team,
      pos: { ...owner.pos },
      vel: scale(dir, speed),
      radius: opts.radius ?? 0.45,
      remaining: opts.range ?? owner.stats.attackRange + 3,
      damage,
      damageType: type,
      pierce: opts.pierce ?? false,
      hitIds: new Set(),
      onHit: opts.onHit,
      abilitySlot: slot,
      sourceHero: owner.heroId,
      level: opts.level ?? 1,
    };
    this.projectiles.push(p);
    return p;
  }

  private updateProjectiles(): void {
    const keep: Projectile[] = [];
    for (const p of this.projectiles) {
      const owner = this.units.get(p.ownerId);
      const step = scale(p.vel, DT);
      const travelled = Math.hypot(step.x, step.y);
      const next = add(p.pos, step);
      if (this.field.isWallAt(next.x, next.y)) continue;
      p.pos = next;
      p.remaining -= travelled;

      let consumed = false;
      for (const u of this.units.values()) {
        if (!u.alive || u.team === p.team) continue;
        if (u.kind === 'WARD') continue;
        if (p.hitIds.has(u.id)) continue;
        if (dist(p.pos, u.pos) > u.radius + p.radius) continue;
        p.hitIds.add(u.id);
        if (owner) {
          this.dealDamage(owner, u, p.damage, { type: p.damageType, label: p.abilitySlot, isBasicAttack: p.abilitySlot === 'AA' });
          if (p.abilitySlot === 'AA' && owner.kind === 'HERO') onBasicAttackHit(this, owner, u);
          else if (owner.kind === 'HERO' && p.abilitySlot) this.onAbilityHit(owner, u, p.abilitySlot, p.level);
        }
        if (!p.pierce) {
          consumed = true;
          break;
        }
      }
      if (!consumed && p.remaining > 0) keep.push(p);
    }
    this.projectiles = keep;
  }

  /** 스킬 적중 후처리 — 영웅 표식 계열은 abilities.ts가 담당 */
  onAbilityHit(source: Unit, target: Unit, slot: string, level = 1): void {
    void level;
    if (source.kind !== 'HERO' || !source.heroId) return;
    onAbilityHit(this, source, target, slot);
  }

  addZone(z: Omit<GroundZone, 'id' | 'hitIds'>): GroundZone {
    const zone: GroundZone = { ...z, id: this.nextId++, hitIds: new Set() };
    this.zones.push(zone);
    return zone;
  }

  private updateZones(): void {
    const keep: GroundZone[] = [];
    for (const z of this.zones) {
      const owner = this.units.get(z.ownerId);
      if (z.fuse > 0) {
        z.fuse -= DT;
        if (z.fuse <= 0 && owner) this.explodeZone(z, owner);
        keep.push(z);
        continue;
      }
      z.duration -= DT;
      // 지속형 지역: 접촉 시 1회 피해
      if (z.kind === 'FLAME_PAGE' && owner) {
        for (const u of this.units.values()) {
          if (!u.alive || u.team === z.team || u.kind === 'WARD') continue;
          if (z.hitIds.has(u.id)) continue;
          if (dist(u.pos, z.pos) <= z.radius + u.radius) {
            z.hitIds.add(u.id);
            this.dealDamage(owner, u, z.damage, { type: z.damageType, label: 'E' });
            this.onAbilityHit(owner, u, 'E', z.level);
          }
        }
      }
      if (z.kind === 'SAFE_ZONE' || z.kind === 'BREATH') {
        // 지속형 아군 버프는 dealDamage 감산에서 조회한다
      }
      if (z.duration > 0) keep.push(z);
    }
    this.zones = keep;
  }

  private explodeZone(z: GroundZone, owner: Unit): void {
    for (const u of this.units.values()) {
      if (!u.alive || u.team === z.team || u.kind === 'WARD') continue;
      if (dist(u.pos, z.pos) > z.radius + u.radius) continue;
      this.dealDamage(owner, u, z.damage, { type: z.damageType, label: z.kind });
      if (z.kind === 'BLANK_FLAME') {
        this.applyCc(owner, u, 'SLOW', 1.2, 0.35);
        this.onAbilityHit(owner, u, 'W', z.level);
      }
      if (z.kind === 'DISSONANCE') {
        this.applyCc(owner, u, 'SILENCE', 0.7);
        this.onAbilityHit(owner, u, 'E', z.level);
      }
    }
  }

  // -------------------------------------------------------------------------
  // 피해 (GDD 4.3)
  // -------------------------------------------------------------------------

  dealDamage(source: Unit, target: Unit, raw: number, opts: DamageOpts): number {
    if (!target.alive || raw <= 0) return 0;
    if (target.kind === 'CORE' && !this.coreVulnerable(target.team)) return 0;

    let amount = raw * (opts.mult ?? 1);

    if (!opts.preMitigated && opts.type !== 'TRUE') {
      const armor = opts.type === 'PHYSICAL' ? target.stats.defense : target.stats.resist;
      const overload = this.structureOverloadReduction(target);
      amount *= mitigation(Math.max(0, armor - overload), source.stats.penetration);
    }

    // 구조물 보정
    if (target.kind === 'TURRET' || target.kind === 'CORE') {
      if (target.structureSlot === 'OUTER' && this.time < STRUCTURE.EARLY_SHIELD_UNTIL) {
        amount *= 1 - STRUCTURE.EARLY_SHIELD_REDUCTION;
      }
      if (source.tag === 'SIEGE') amount *= MINION.SIEGE_STRUCTURE_MULT;
      if (this.time < this.teams[source.team].deepWhaleUntil) amount *= 1 + NEUTRALS.DEEP_WHALE.structureDamageBonus;
      if (source.kind === 'HERO' && opts.isBasicAttack) {
        const key = 'turretRamp';
        const m = source.marks.get(key);
        const stacks = m && m.expiresAt > this.time ? m.stacks : 0;
        amount *= 1 + Math.min(STRUCTURE.TURRET_RAMP_MAX, stacks * STRUCTURE.TURRET_RAMP_PER_HIT);
        source.marks.set(key, { key, stacks: stacks + 1, expiresAt: this.time + 4, sourceId: target.id });
      }
    }

    // 아군 피해 감소 지역 (가온 W / 연화 R)
    amount *= this.damageReductionFor(target);

    amount = Math.max(opts.type === 'TRUE' ? 1 : 1, Math.floor(amount));

    // 보호막 → 체력
    let remain = amount;
    for (const s of target.shields) {
      if (remain <= 0) break;
      const used = Math.min(s.amount, remain);
      s.amount -= used;
      remain -= used;
    }
    target.shields = target.shields.filter((s) => s.amount > 0);
    target.stats.hp -= remain;

    target.recentDamagers.set(source.id, this.time);
    target.lastCombatAt = this.time;
    source.lastCombatAt = this.time;

    if (source.kind === 'HERO' && target.kind === 'HERO') this.recordFight(source);

    if (target.stats.hp <= 0) this.killUnit(source, target);
    return amount;
  }

  private damageReductionFor(target: Unit): number {
    let mult = 1;
    for (const z of this.zones) {
      if (z.team !== target.team) continue;
      if (z.kind !== 'SAFE_ZONE' && z.kind !== 'BREATH') continue;
      if (dist(target.pos, z.pos) > z.radius) continue;
      mult *= 1 - z.damage; // damage 필드를 감소율로 재사용
    }
    return mult;
  }

  private structureOverloadReduction(target: Unit): number {
    if (target.kind !== 'TURRET' && target.kind !== 'CORE') return 0;
    if (this.overloadSteps <= 0) return 0;
    return STRUCTURE.OVERLOAD_INITIAL + (this.overloadSteps - 1) * STRUCTURE.OVERLOAD_STEP;
  }

  /** 접힘 구역 인근에서 벌어진 영웅 교전 수 — 접힘이 교전 위치를 바꾸는지 측정 */
  private recordFight(source: Unit): void {
    const near = OUTER_FIGHT_ZONES.some((z) => dist(source.pos, z) < 14);
    if (!near) return;
    if (this.time >= TIMETABLE.WORLD_FOLD_STAGE_1 - 60 && this.time < TIMETABLE.WORLD_FOLD_STAGE_1) this.fightsBeforeFold++;
    if (this.time >= TIMETABLE.WORLD_FOLD_STAGE_1 && this.time < TIMETABLE.WORLD_FOLD_STAGE_1 + 60) this.fightsAfterFold++;
  }

  heal(source: Unit, target: Unit, amount: number): void {
    if (!target.alive) return;
    target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + amount);
    void source;
  }

  addShield(source: Unit, target: Unit, amount: number, duration: number): void {
    target.shields.push({ amount, expiresAt: this.time + duration, sourceId: source.id });
  }

  /** GDD 4.4 — 강인함·연속 감소 적용 */
  applyCc(source: Unit, target: Unit, kind: CcKind, duration: number, magnitude?: number): void {
    if (!target.alive) return;
    if (target.kind === 'TURRET' || target.kind === 'CORE') return;
    let dur = duration;
    const diminishing = kind === 'STUN' || kind === 'ROOT' || kind === 'SILENCE';
    if (diminishing) {
      const key = `dr:${kind}`;
      const m = target.marks.get(key);
      const stacks = m && m.expiresAt > this.time ? m.stacks : 0;
      if (stacks > 0) dur = Math.max(CC.DIMINISH_FLOOR, dur * Math.pow(1 - CC.DIMINISH_RATE, stacks));
      target.marks.set(key, { key, stacks: stacks + 1, expiresAt: this.time + CC.DIMINISH_WINDOW, sourceId: source.id });
    }
    if (kind === 'AIRBORNE') dur = Math.min(CC.AIRBORNE_MAX, dur);
    target.statuses.push({ kind, remaining: dur, magnitude, sourceId: source.id });
    if (kind !== 'SLOW') {
      // 가온 패시브: 적 이동 방해 시 보호막
      tickHeroPassives(this, source, { ccApplied: true });
    }
  }

  /** 밀치기/당김 */
  displace(target: Unit, dir: Vec2, distance: number): void {
    if (target.immobile) return;
    const d = scale(norm(dir), distance);
    target.pos = this.field.resolveMove(target.pos, d, target.radius);
  }

  // -------------------------------------------------------------------------
  // 사망과 보상
  // -------------------------------------------------------------------------

  private killUnit(source: Unit, target: Unit): void {
    target.alive = false;
    target.stats.hp = 0;
    target.shields = [];
    target.statuses = [];

    if (target.kind === 'HERO') {
      const bounty = killBounty(target.killStreak, target.deathStreak);
      target.deaths++;
      target.deathStreak++;
      target.killStreak = 0;
      target.respawnIn = respawnTime(target.level, this.time);
      this.teams[source.team].kills++;

      const killer = source.kind === 'HERO' ? source : this.units.get(source.id);
      if (killer && killer.kind === 'HERO') {
        killer.gold += REWARDS.HERO_KILL.gold + bounty;
        killer.xp += REWARDS.HERO_KILL.xp;
        killer.kills++;
        killer.killStreak++;
        killer.deathStreak = 0;
      }
      // 8초 내 기여자에게 지원 골드 분할 (GDD 4.5)
      const assisters = [...target.recentDamagers.keys()]
        .map((id) => this.units.get(id))
        .filter((u): u is Unit => !!u && u.kind === 'HERO' && u.team !== target.team && u.id !== source.id);
      const share = assistShare(bounty, assisters.length);
      for (const a of assisters) {
        a.gold += share;
        a.xp += Math.floor(REWARDS.HERO_KILL.xp * 0.5);
        a.assists++;
      }
      this.log('HERO_KILL', `${source.name} → ${target.name}`);
      return;
    }

    if (target.kind === 'MINION') {
      const kind = (target.tag ?? 'MELEE') as 'MELEE' | 'RANGED' | 'SIEGE';
      const r = kind === 'MELEE' ? REWARDS.MELEE_MINION : kind === 'RANGED' ? REWARDS.RANGED_MINION : REWARDS.SIEGE_MINION;
      if (source.kind === 'HERO') source.gold += r.gold;
      // 경험치는 11m 내 적 팀 영웅에게 분배
      for (const h of this.units.values()) {
        if (h.kind !== 'HERO' || !h.alive || h.team === target.team) continue;
        if (dist(h.pos, target.pos) <= XP_SHARE_RADIUS) h.xp += r.xp;
      }
      this.units.delete(target.id);
      return;
    }

    if (target.kind === 'TURRET') {
      const r = target.structureSlot === 'OUTER' ? REWARDS.OUTER_TURRET : REWARDS.INNER_TURRET;
      for (const h of this.heroes(source.team)) h.gold += r.teamGold / 5;
      if (source.kind === 'HERO') source.gold += r.lastHitGold;
      this.teams[source.team].towersDown++;
      this.log('TURRET_DOWN', `${target.name} (${target.team === 0 ? '청' : '적'})`);
      return;
    }

    if (target.kind === 'CORE') {
      this.over = true;
      this.winner = source.team;
      this.endReason = 'CORE_DESTROYED';
      this.log('MATCH_END', `${source.team === 0 ? '청' : '적'} 승리`);
      return;
    }

    if (target.kind === 'OBJECTIVE' || target.kind === 'CAMP') {
      this.onNeutralKilled(source, target);
      this.units.delete(target.id);
      return;
    }

    this.units.delete(target.id);
  }

  private updateRespawns(): void {
    for (const u of this.units.values()) {
      if (u.alive || u.kind !== 'HERO') continue;
      u.respawnIn -= DT;
      if (u.respawnIn <= 0) {
        u.alive = true;
        u.pos = { ...SPAWN[u.team] };
        u.stats.hp = u.stats.maxHp;
        u.marks.clear();
        u.cooldowns = {};
        if (u.ai) {
          u.ai.path = [];
          u.ai.repathIn = 0;
          u.ai.intent = 'LANE';
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // 중립 오브젝트 (GDD 4.7)
  // -------------------------------------------------------------------------

  private updateNeutrals(): void {
    // 정글 캠프
    if (this.time >= NEUTRALS.CAMP.spawnAt) {
      CAMPS.forEach((c, i) => {
        const nextAt = this.campRespawn.get(i);
        if (nextAt === undefined) {
          this.campRespawn.set(i, this.time);
          this.spawnCamp(i);
        } else if (nextAt <= this.time && !this.allUnits().some((u) => u.kind === 'CAMP' && u.tag === `CAMP_${i}`)) {
          this.spawnCamp(i);
        }
      });
    }
    // 강 정찰핵 (심층 고래가 강 중앙을 차지하는 동안은 생성하지 않는다)
    const deepAlive = this.allUnits().some((u) => u.tag === 'DEEP_WHALE' && u.alive);
    if (!deepAlive && this.time >= this.scoutNextAt && !this.allUnits().some((u) => u.tag === 'SCOUT_NODE')) {
      const node = this.addUnit({
        kind: 'OBJECTIVE',
        team: 0,
        pos: { ...OBJECTIVE_POS.SCOUT_NODE },
        name: '강 정찰핵',
        radius: 1.1,
        immobile: true,
        tag: 'SCOUT_NODE',
        stats: baseStats({ hp: 2, ad: 0, defense: 0, resist: 0, attackRange: 0, attackSpeed: 0, moveSpeed: 0 }),
      });
      node.scratch.spawnedAt = this.time;
      this.log('SCOUT_NODE_SPAWN');
      this.scoutNextAt = this.time + NEUTRALS.SCOUT_NODE.respawn;
    }
    // 천정 고래
    if (this.time >= this.skyWhaleNextAt && !this.allUnits().some((u) => u.tag === 'SKY_WHALE')) {
      const hp = NEUTRALS.SKY_WHALE.hp + (NEUTRALS.SKY_WHALE.hpPerMinute * this.time) / 60;
      // 진영 편향 제거: 생성할 때마다 강의 두 지점을 번갈아 쓴다
      const site = this.skyWhaleSpawns % 2 === 0 ? OBJECTIVE_POS.SKY_WHALE_A : OBJECTIVE_POS.SKY_WHALE_B;
      this.skyWhaleSpawns++;
      this.skyWhaleSite = { ...site };
      const whale = this.addUnit({
        kind: 'OBJECTIVE',
        team: 0,
        pos: { ...site },
        name: '천정 고래',
        radius: 2.6,
        immobile: true,
        tag: 'SKY_WHALE',
        stats: baseStats({ hp, ad: NEUTRALS.SKY_WHALE.ad, defense: NEUTRALS.SKY_WHALE.defense, resist: NEUTRALS.SKY_WHALE.resist, attackRange: NEUTRALS.SKY_WHALE.range, attackSpeed: 0.6, moveSpeed: 0 }),
      });
      whale.scratch.spawnedAt = this.time;
      this.log('SKY_WHALE_SPAWN');
      this.skyWhaleNextAt = Infinity; // 처치 시 재설정
    }
    // 심층 고래
    if (!this.deepWhaleSpawned && this.time >= NEUTRALS.DEEP_WHALE.spawnAt) {
      this.deepWhaleSpawned = true;
      const deep = this.addUnit({
        kind: 'OBJECTIVE',
        team: 0,
        pos: { ...OBJECTIVE_POS.DEEP_WHALE },
        name: '심층 고래',
        radius: 3.2,
        immobile: true,
        tag: 'DEEP_WHALE',
        stats: baseStats({ hp: NEUTRALS.DEEP_WHALE.hp, ad: NEUTRALS.DEEP_WHALE.ad, defense: NEUTRALS.DEEP_WHALE.defense, resist: NEUTRALS.DEEP_WHALE.resist, attackRange: NEUTRALS.DEEP_WHALE.range, attackSpeed: 0.5, moveSpeed: 0 }),
      });
      deep.scratch.spawnedAt = this.time;
      this.log('DEEP_WHALE_SPAWN');
    }
    // 중립 몬스터 반격
    for (const u of this.units.values()) {
      if (!u.alive || (u.kind !== 'CAMP' && u.kind !== 'OBJECTIVE')) continue;
      if (u.tag === 'SCOUT_NODE') continue;
      let target: Unit | null = null;
      for (const [id, t] of u.recentDamagers) {
        if (this.time - t > 4) continue;
        const c = this.units.get(id);
        if (c && c.alive && dist(c.pos, u.pos) < u.stats.attackRange + 4) target = c;
      }
      u.targetId = target?.id;
    }
  }

  private spawnCamp(i: number): void {
    const c = CAMPS[i];
    this.addUnit({
      kind: 'CAMP',
      team: 0,
      pos: { ...c.pos },
      name: c.name,
      radius: 1.4,
      immobile: true,
      tag: `CAMP_${i}`,
      stats: baseStats({ hp: NEUTRALS.CAMP.hp, ad: NEUTRALS.CAMP.ad, defense: NEUTRALS.CAMP.defense, resist: NEUTRALS.CAMP.resist, attackRange: NEUTRALS.CAMP.range, attackSpeed: 0.7, moveSpeed: 0 }),
    });
  }

  private onNeutralKilled(source: Unit, target: Unit): void {
    const team = source.team;
    if (target.tag === 'SKY_WHALE') {
      this.teams[team].skyWhaleUntil = this.time + NEUTRALS.SKY_WHALE.buffDuration;
      for (const h of this.heroes(team)) {
        h.gold += REWARDS.SKY_WHALE.teamGold;
        h.xp += REWARDS.SKY_WHALE.teamXp;
      }
      this.skyWhaleNextAt = this.time + NEUTRALS.SKY_WHALE.respawn;
      this.log('SKY_WHALE_TAKEN', team === 0 ? '청' : '적');
      return;
    }
    if (target.tag === 'DEEP_WHALE') {
      this.teams[team].deepWhaleUntil = this.time + NEUTRALS.DEEP_WHALE.buffDuration;
      for (const h of this.heroes(team)) {
        h.gold += REWARDS.DEEP_WHALE.teamGold;
        h.xp += REWARDS.DEEP_WHALE.teamXp;
      }
      this.log('DEEP_WHALE_TAKEN', team === 0 ? '청' : '적');
      return;
    }
    if (target.tag === 'SCOUT_NODE') {
      this.teams[team].scoutVisionUntil = this.time + NEUTRALS.SCOUT_NODE.visionDuration;
      this.log('SCOUT_NODE_TAKEN', team === 0 ? '청' : '적');
      return;
    }
    if (target.kind === 'CAMP') {
      if (source.kind === 'HERO') {
        source.gold += REWARDS.CAMP.gold;
        source.xp += REWARDS.CAMP.xp;
        source.stats.hp = Math.min(source.stats.maxHp, source.stats.hp + source.stats.maxHp * 0.08);
      }
      const idx = Number((target.tag ?? 'CAMP_0').split('_')[1]);
      this.campRespawn.set(idx, this.time + NEUTRALS.CAMP.respawn);
    }
  }

  /** 직조핵 공격 가능 여부 */
  coreVulnerable(team: Team): boolean {
    const inners = this.allUnits().filter((u) => u.kind === 'TURRET' && u.team === team && u.structureSlot === 'INNER' && u.alive);
    return this.opts.coreShieldMode === 'ANY_INNER_DOWN' ? inners.length < 3 : inners.length === 0;
  }

  // -------------------------------------------------------------------------
  // 시야 (GDD 4.8)
  // -------------------------------------------------------------------------

  private recomputeVision(): void {
    for (const team of [0, 1] as Team[]) {
      const grid = this.visionGrid[team];
      grid.fill(0);
      const sources: { pos: Vec2; r: number }[] = [];
      for (const u of this.units.values()) {
        if (!u.alive || u.team !== team) continue;
        if (u.kind === 'HERO') sources.push({ pos: u.pos, r: VISION.HERO });
        else if (u.kind === 'MINION') sources.push({ pos: u.pos, r: VISION.MINION });
        else if (u.kind === 'TURRET' || u.kind === 'CORE') sources.push({ pos: u.pos, r: VISION.TURRET });
        else if (u.kind === 'WARD') sources.push({ pos: u.pos, r: VISION.WARD_RADIUS });
      }
      if (this.time < this.teams[team].scoutVisionUntil) sources.push({ pos: { ...CENTER }, r: 22 });
      for (const s of sources) {
        const cells = Math.ceil(s.r / this.visionCell);
        const cx = Math.floor(s.pos.x / this.visionCell);
        const cy = Math.floor(s.pos.y / this.visionCell);
        for (let dy = -cells; dy <= cells; dy++) {
          for (let dx = -cells; dx <= cells; dx++) {
            const gx = cx + dx;
            const gy = cy + dy;
            if (gx < 0 || gy < 0 || gx >= this.visionDim || gy >= this.visionDim) continue;
            const idx = gy * this.visionDim + gx;
            if (grid[idx]) continue;
            const p = { x: gx * this.visionCell + this.visionCell / 2, y: gy * this.visionCell + this.visionCell / 2 };
            if (dist(p, s.pos) > s.r) continue;
            if (!this.field.lineOfSight(s.pos, p)) continue;
            grid[idx] = 1;
          }
        }
      }
    }
  }

  isVisibleTo(team: Team, p: Vec2): boolean {
    const gx = Math.floor(p.x / this.visionCell);
    const gy = Math.floor(p.y / this.visionCell);
    if (gx < 0 || gy < 0 || gx >= this.visionDim || gy >= this.visionDim) return false;
    return this.visionGrid[team][gy * this.visionDim + gx] === 1;
  }

  /** 부시 규칙 포함한 유닛 가시성 */
  canSee(team: Team, u: Unit): boolean {
    if (u.team === team) return true;
    if (!this.isVisibleTo(team, u.pos)) return false;
    if (this.field.isBush(u.pos)) {
      if (this.time - u.lastCombatAt < 1) return true;
      for (const o of this.units.values()) {
        if (o.team !== team || !o.alive) continue;
        if (dist(o.pos, u.pos) <= VISION.BUSH_REVEAL_RANGE) return true;
      }
      return false;
    }
    return true;
  }

  // -------------------------------------------------------------------------
  // 스킬 시전 진입점
  // -------------------------------------------------------------------------

  cast(u: Unit, slot: 'Q' | 'W' | 'E' | 'R', aim: Vec2 | null, targetId?: number): boolean {
    if (!u.alive || u.kind !== 'HERO' || !u.heroId) return false;
    if (this.isSilenced(u) || u.castLock > 0) return false;
    const lvl = u.skillLevels[slot] ?? 0;
    if (lvl <= 0) return false;
    if ((u.cooldowns[slot] ?? 0) > 0) return false;
    const ok = castAbility(this, u, slot, aim, targetId);
    if (ok) {
      const spec = HEROES[u.heroId].abilities[slot];
      const base = spec.cooldown[Math.min(spec.cooldown.length - 1, lvl - 1)];
      u.cooldowns[slot] = cooldownWithHaste(base, u.stats.haste);
      if (spec.castLock) u.castLock = spec.castLock;
    }
    return ok;
  }

  // -------------------------------------------------------------------------
  // 종료 판정
  // -------------------------------------------------------------------------

  private checkEnd(): void {
    if (this.over) return;
    if (this.time > 45 * 60) {
      this.over = true;
      this.winner = null;
      this.endReason = 'TIMEOUT';
    }
    if (this.opts.allowSurrender && this.time >= 480) {
      for (const team of [0, 1] as Team[]) {
        const deficit = this.teamNetWorth(enemyOf(team)) - this.teamNetWorth(team);
        const inners = this.allUnits().filter((u) => u.kind === 'TURRET' && u.team === team && u.structureSlot === 'INNER' && u.alive).length;
        if (deficit > 14000 && inners === 0) {
          this.over = true;
          this.winner = enemyOf(team);
          this.endReason = 'SURRENDER';
          this.log('SURRENDER', team === 0 ? '청' : '적');
        }
      }
    }
  }

  stats(): MatchStats {
    const comeback = this.winner !== null && this.leaderAt8 !== null && this.winner !== this.leaderAt8;
    return {
      durationSec: this.time,
      winner: this.winner,
      goldDiffAt8: this.goldDiffAt8,
      comeback,
      kills: [this.teams[0].kills, this.teams[1].kills],
      towers: [this.teams[0].towersDown, this.teams[1].towersDown],
      fightsBeforeFold: this.fightsBeforeFold,
      fightsAfterFold: this.fightsAfterFold,
      events: this.events,
      endReason: this.endReason,
    };
  }
}

// ---------------------------------------------------------------------------
// 보조
// ---------------------------------------------------------------------------

/**
 * 접힘으로 열리는 구역의 중심 — 교전 위치 통계용.
 * 하드코딩하면 실제 FOLD_ZONES와 어긋나 지표가 거짓말을 한다(첫 구현이 그랬다).
 * 반드시 맵이 실제로 여는 사각형에서 파생시킨다.
 */
const OUTER_FIGHT_ZONES: Vec2[] = FOLD_ZONES.map((z) => ({ x: (z.min.x + z.max.x) / 2, y: (z.min.y + z.max.y) / 2 }));

function emptyTeamState(): TeamState {
  return { gold: 0, kills: 0, towersDown: 0, skyWhaleUntil: -1, deepWhaleUntil: -1, scoutVisionUntil: -1 };
}

export function baseStats(p: {
  hp: number;
  ad: number;
  defense: number;
  resist: number;
  attackRange: number;
  attackSpeed: number;
  moveSpeed: number;
  sp?: number;
}): Stats {
  return {
    hp: p.hp,
    maxHp: p.hp,
    ad: p.ad,
    sp: p.sp ?? 0,
    defense: p.defense,
    resist: p.resist,
    attackSpeed: p.attackSpeed,
    moveSpeed: p.moveSpeed,
    haste: 0,
    penetration: 0,
    attackRange: p.attackRange,
  };
}

export function heroStatsAtLevel(heroId: string, level: number): Stats {
  const b = HEROES[heroId].base;
  const n = level - 1;
  return baseStats({
    hp: b.hp + b.hpPerLevel * n,
    ad: b.ad + b.adPerLevel * n,
    defense: b.defense + b.defensePerLevel * n,
    resist: b.resist + b.resistPerLevel * n,
    attackRange: b.attackRange,
    attackSpeed: b.attackSpeed,
    moveSpeed: b.moveSpeed,
  });
}

function segmentsIntersect(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): boolean {
  const d = (a: Vec2, b: Vec2, c: Vec2) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** GDD 3.7 — 기본 공격 타기팅 우선순위 */
export function pickAutoTarget(
  world: World,
  u: Unit,
  mode: 'DEFAULT' | 'HERO_PRIORITY' | 'MINION_PRIORITY',
  manualTargetId?: number,
): Unit | null {
  const range = u.stats.attackRange + u.radius + 1;
  const inRange = (o: Unit) => o.alive && o.team !== u.team && o.kind !== 'WARD' && dist(u.pos, o.pos) <= range + o.radius && world.field.lineOfSight(u.pos, o.pos);

  if (manualTargetId !== undefined) {
    const m = world.units.get(manualTargetId);
    if (m && inRange(m)) return m;
  }

  const candidates = [...world.units.values()].filter(inRange).filter((o) => !(o.kind === 'CORE' && !world.coreVulnerable(o.team)));
  if (!candidates.length) return null;

  const effectiveHp = (o: Unit) => o.stats.hp + o.shields.reduce((s, x) => s + x.amount, 0);

  if (mode === 'HERO_PRIORITY') {
    const heroes = candidates.filter((o) => o.kind === 'HERO');
    if (heroes.length) return heroes.sort((a, b) => effectiveHp(a) - effectiveHp(b))[0];
  }
  if (mode === 'MINION_PRIORITY') {
    const minions = candidates.filter((o) => o.kind === 'MINION' || o.kind === 'TURRET' || o.kind === 'CORE');
    if (minions.length) {
      const killable = minions.filter((o) => effectiveHp(o) <= u.stats.ad * 1.05);
      if (killable.length) return killable.sort((a, b) => effectiveHp(a) - effectiveHp(b))[0];
      return minions.sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos))[0];
    }
  }
  // 막타 보조: 처치 가능한 미니언 우선
  const killableMinion = candidates.filter((o) => o.kind === 'MINION' && effectiveHp(o) <= u.stats.ad * 1.05);
  if (killableMinion.length) return killableMinion.sort((a, b) => effectiveHp(a) - effectiveHp(b))[0];

  return candidates.sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos))[0];
}
