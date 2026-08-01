// 에코샤드 프로토타입 — 공통 타입
// 이 프로토타입은 GDD "3. 핵심 경기 설계"와 "4. 전투·경제·밸런스 규칙"을 로컬 단일 프로세스로 재현한다.
// 온라인 대전·랭크·상점 UI는 범위에서 제외되었으므로 서버 권위 구조 대신 결정적 로컬 틱만 사용한다.

export type Team = 0 | 1; // 0 = 청(플레이어), 1 = 적

export interface Vec2 {
  x: number;
  y: number;
}

export type Lane = 'TOP' | 'MID' | 'BOT';

export type RoleId = 'GUARDIAN' | 'STALKER' | 'MAGE' | 'MARKSMAN' | 'CONDUCTOR';

export type UnitKind = 'HERO' | 'MINION' | 'TURRET' | 'CORE' | 'CAMP' | 'OBJECTIVE' | 'WARD' | 'WALL';

export type DamageType = 'PHYSICAL' | 'MAGIC' | 'TRUE';

/** GDD 4.4 군중제어 분류 */
export type CcKind = 'STUN' | 'ROOT' | 'SILENCE' | 'AIRBORNE' | 'SLOW' | 'SUPPRESS';

export interface StatusEffect {
  kind: CcKind;
  /** 남은 시간(초) */
  remaining: number;
  /** 둔화 전용: 0~1 감소 비율 */
  magnitude?: number;
  sourceId: number;
}

export interface Mark {
  /** 마크 종류 키. 영웅 고유 표식(별못/문양/공백/쉼표 등)에 사용 */
  key: string;
  stacks: number;
  expiresAt: number;
  sourceId: number;
  /** 사엘 주석 전용: 어떤 문양이 찍혔는지 */
  glyphs?: Set<'Q' | 'W' | 'E'>;
}

export interface Shield {
  amount: number;
  expiresAt: number;
  sourceId: number;
}

export interface Stats {
  hp: number;
  maxHp: number;
  ad: number;
  sp: number;
  defense: number;
  resist: number;
  attackSpeed: number;
  moveSpeed: number;
  /** 가속: cd = base * 100/(100+haste) */
  haste: number;
  penetration: number;
  attackRange: number;
}

export interface AbilitySpec {
  slot: 'P' | 'Q' | 'W' | 'E' | 'R';
  name: string;
  /** 레벨별 재사용 대기시간(초). 길이 1이면 전 레벨 동일 */
  cooldown: number[];
  /** 레벨별 기본 피해 */
  baseDamage?: number[];
  adRatio?: number;
  spRatio?: number;
  range?: number;
  damageType?: DamageType;
  /** 시전 후 고정 경직(초) */
  castLock?: number;
  targeting: 'DIRECTION' | 'POSITION' | 'UNIT' | 'SELF';
  /** GDD 3.8: 치명적 범위기는 250ms 이상 예고 */
  telegraph?: number;
  description: string;
}

export interface HeroSpec {
  id: string;
  name: string;
  role: RoleId;
  faction: string;
  difficulty: '낮음' | '중간' | '높음';
  lane: Lane | 'JUNGLE';
  base: {
    hp: number;
    hpPerLevel: number;
    ad: number;
    adPerLevel: number;
    defense: number;
    defensePerLevel: number;
    resist: number;
    resistPerLevel: number;
    moveSpeed: number;
    attackRange: number;
    /** GDD 4.2 범위 0.65~0.95. 개별 값은 문서에 없어 역할 기준으로 배분한 가정치 */
    attackSpeed: number;
  };
  abilities: Record<'P' | 'Q' | 'W' | 'E' | 'R', AbilitySpec>;
  /** 자동 구매 추천 빌드(GDD 6.1: 자동 구매는 추천 빌드만 허용) */
  build: string[];
  color: string;
}

export interface ItemSpec {
  id: string;
  name: string;
  cost: number;
  ad?: number;
  sp?: number;
  hp?: number;
  defense?: number;
  resist?: number;
  haste?: number;
  penetration?: number;
  attackSpeed?: number;
  moveSpeed?: number;
  note: string;
}

export interface Projectile {
  id: number;
  ownerId: number;
  team: Team;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  /** 남은 사거리(m) */
  remaining: number;
  damage: number;
  damageType: DamageType;
  /** 관통 여부 */
  pierce: boolean;
  hitIds: Set<number>;
  onHit?: string;
  abilitySlot?: 'Q' | 'W' | 'E' | 'R' | 'AA';
  sourceHero?: string;
  level: number;
}

export interface GroundZone {
  id: number;
  ownerId: number;
  team: Team;
  pos: Vec2;
  radius: number;
  /** 폭발까지 남은 시간. 0 이하이면 즉시 지속 효과 */
  fuse: number;
  duration: number;
  kind: string;
  damage: number;
  damageType: DamageType;
  level: number;
  hitIds: Set<number>;
}

export interface Unit {
  id: number;
  kind: UnitKind;
  team: Team;
  pos: Vec2;
  /** 이번 틱 이동 의도 방향(정규화) */
  moveDir: Vec2;
  facing: Vec2;
  radius: number;
  stats: Stats;
  alive: boolean;
  /** 사망 후 재결속까지 남은 시간 */
  respawnIn: number;
  level: number;
  xp: number;
  gold: number;
  netWorth: number;
  statuses: StatusEffect[];
  marks: Map<string, Mark>;
  shields: Shield[];
  /** 스킬 슬롯별 남은 쿨타임 */
  cooldowns: Record<string, number>;
  /** 스킬 레벨 */
  skillLevels: Record<string, number>;
  attackCooldown: number;
  /** 시전 경직 남은 시간 */
  castLock: number;
  heroId?: string;
  lane?: Lane | 'JUNGLE';
  name: string;
  items: string[];
  /** 라인/캠프 등 소속 표시 */
  tag?: string;
  targetId?: number;
  /** 미니언·봇 경로 진행도 */
  pathT?: number;
  killStreak: number;
  deathStreak: number;
  kills: number;
  deaths: number;
  assists: number;
  /** 최근 피해 기여자: id -> 시각 */
  recentDamagers: Map<number, number>;
  lastCombatAt: number;
  /** 봇 전용 상태 */
  ai?: BotState;
  /** 정찰핵/오브젝트 만료 */
  expiresAt?: number;
  /** 구조물 전용 */
  structureSlot?: 'OUTER' | 'INNER' | 'CORE';
  /** 이동 불가(구조물/캠프) */
  immobile?: boolean;
  /** 영웅 스킬이 쓰는 임시 저장소 (네루 W 저장 위치, 궁극기 예약 등) */
  scratch: Record<string, number | Vec2 | boolean | undefined>;
}

export interface BotState {
  intent: string;
  /** 목표 좌표 */
  goal: Vec2 | null;
  path: Vec2[];
  pathIndex: number;
  repathIn: number;
  decisionIn: number;
  recallingFor: number;
  homeLane: Lane | 'JUNGLE';
}

export interface MatchEvent {
  t: number;
  code: string;
  detail?: string;
}

export interface TeamState {
  gold: number;
  kills: number;
  towersDown: number;
  /** 강화 버프 만료 시각 */
  skyWhaleUntil: number;
  deepWhaleUntil: number;
  scoutVisionUntil: number;
}

export interface MatchStats {
  durationSec: number;
  winner: Team | null;
  goldDiffAt8: number;
  /** 8분 시점 열세팀이 최종 승리했는가 */
  comeback: boolean;
  kills: [number, number];
  towers: [number, number];
  /** 접힘 전후 60초 동안 외곽 정글 구역에서 발생한 교전 수 */
  fightsBeforeFold: number;
  fightsAfterFold: number;
  events: MatchEvent[];
  endReason: string;
}
