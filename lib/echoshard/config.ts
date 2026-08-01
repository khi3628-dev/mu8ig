// 에코샤드 프로토타입 — GDD 수치 이식본
// 출처 표기: 각 상수 주석의 절 번호는 'EchoShard_Mobile_MOBA_GDD_KO.docx' 기준.
// 문서에 값이 없어 프로토타입을 돌리기 위해 채운 값은 [가정] 으로 표시했다.

import type { HeroSpec, ItemSpec } from './types';

/** GDD 10.1 / 10.2 — 전투는 20Hz 고정 틱 */
export const TICK_HZ = 20;
export const DT = 1 / TICK_HZ;

/** GDD 3.2 — 직조분지. 회전 대칭 정사각 전장 [가정: 실제 치수는 문서 미기재] */
export const MAP_SIZE = 120;
export const CENTER = { x: MAP_SIZE / 2, y: MAP_SIZE / 2 };

/** GDD 3.3 경기 시간표 (초) */
export const TIMETABLE = {
  MATCH_ACTIVE: 0,
  FIRST_WAVE: 25,
  SCOUT_NODE_SPAWN: 150,
  SKY_WHALE_SPAWN: 300,
  WORLD_FOLD_STAGE_1: 480,
  DEEP_WHALE_SPAWN: 600,
  MINION_SCALING_2: 720,
  CORE_OVERLOAD: 840,
  WORLD_FOLD_FINAL: 1080,
} as const;

/** GDD 3.1 — 항복 8:00부터 4/5 찬성 */
export const SURRENDER_FROM = 480;

/** GDD 3.1 — 레벨 1~12, 궁극기 5레벨, 최대 스킬 레벨 4 */
export const MAX_LEVEL = 12;
export const MAX_SKILL_LEVEL = 4;
export const ULT_LEVEL_UNLOCK = [5, 9, 12]; // [가정] 문서는 "궁극기 5레벨"만 명시

/** GDD 4.5 — 경험치 곡선 */
export function xpToNext(level: number): number {
  return Math.round(180 + 52 * level + 8 * level * level);
}

/** GDD 4.5 — 패시브 골드 */
export const PASSIVE_GOLD_START_AT = 20;
export const PASSIVE_GOLD_EARLY = 2.7;
export const PASSIVE_GOLD_LATE = 3.2;

/** GDD 4.5 — 현상금과 지원 골드 */
export function killBounty(netWorthStreak: number, deathStreak: number): number {
  return Math.max(0, Math.min(360, 60 * netWorthStreak - 40 * deathStreak));
}
export function assistShare(bounty: number, eligible: number): number {
  if (eligible <= 0) return 0;
  return Math.floor((110 + bounty * 0.35) / eligible);
}

/** GDD 4.5 — 처치·미니언 보상 */
export const REWARDS = {
  MELEE_MINION: { gold: 42, xp: 58 },
  RANGED_MINION: { gold: 28, xp: 39 },
  SIEGE_MINION: { gold: 72, xp: 92 },
  HERO_KILL: { gold: 220, xp: 160 },
  OUTER_TURRET: { teamGold: 260, lastHitGold: 80 },
  INNER_TURRET: { teamGold: 260, lastHitGold: 80 }, // [가정] 문서는 외곽만 명시
  SKY_WHALE: { teamGold: 80, teamXp: 90 },
  DEEP_WHALE: { teamGold: 100, teamXp: 120 },
  CAMP: { gold: 46, xp: 52 }, // [가정] 문서는 "골드·경험치·정글러 회복"만 기재
} as const;

/** GDD 4.5 — 경험치 공유 반경 */
export const XP_SHARE_RADIUS = 11;
/** GDD 4.5 — 처치 기여 인정 시간 */
export const ASSIST_WINDOW = 8;

/** GDD 4.6 — 미니언과 구조물 */
export const MINION = {
  WAVE_INTERVAL: 25,
  MELEE_PER_WAVE: 3,
  RANGED_PER_WAVE: 3,
  /** 공성 미니언: 3웨이브마다, 8분 후 2웨이브마다 */
  SIEGE_EVERY_EARLY: 3,
  SIEGE_EVERY_LATE: 2,
  SIEGE_STRUCTURE_MULT: 1.75,
  /** 영웅 공격 시 어그로 유지 시간 */
  AGGRO_HOLD: 2.5,
} as const;

/** [가정] 미니언 개별 스탯. 문서는 보상과 웨이브 구성만 규정한다. */
export const MINION_STATS = {
  MELEE: { hp: 470, ad: 26, defense: 0, resist: 0, moveSpeed: 3.6, range: 1.2, attackSpeed: 1.0 },
  RANGED: { hp: 320, ad: 32, defense: 0, resist: 0, moveSpeed: 3.6, range: 4.8, attackSpeed: 0.9 },
  SIEGE: { hp: 900, ad: 44, defense: 12, resist: 12, moveSpeed: 3.4, range: 5.6, attackSpeed: 0.7 },
} as const;

/** 미니언 성장 [가정]: 12:00 MINION_SCALING_2 를 표현하기 위한 단순 배수 */
export const MINION_SCALING = { at: TIMETABLE.MINION_SCALING_2, hpMult: 1.45, adMult: 1.35 };

export const STRUCTURE = {
  OUTER: { hp: 3600, defense: 55, resist: 55, ad: 175, range: 7.5, attackSpeed: 0.8 },
  INNER: { hp: 4200, defense: 65, resist: 65, ad: 195, range: 7.5, attackSpeed: 0.8 },
  CORE: { hp: 6000, defense: 70, resist: 70, ad: 0, range: 0, attackSpeed: 0 },
  /** GDD 4.6 — 0~3분 외곽 포탑 피해 감소 35% */
  EARLY_SHIELD_UNTIL: 180,
  EARLY_SHIELD_REDUCTION: 0.35,
  /** GDD 4.6 — 14분 과부하: 모든 구조물 방어 -25, 이후 60초마다 -15, 하한 0 */
  OVERLOAD_INITIAL: 25,
  OVERLOAD_STEP: 15,
  OVERLOAD_STEP_INTERVAL: 60,
  /** GDD 4.6 — 영웅 연속 타격 시 포탑 피해 증가 */
  TURRET_RAMP_PER_HIT: 0.18,
  TURRET_RAMP_MAX: 0.72,
} as const;

/**
 * 직조핵 보호 규칙.
 * 문서 내부에 모순이 있다: 표 21은 "내곽 포탑 하나 이상 파괴 시 공격 가능",
 * 부록 C 불변식은 "연결된 내곽 포탑이 하나 이상 생존하면 피해를 받지 않는다"(= 전부 파괴 필요).
 * 15분 목표에 부합하는 표 21 해석을 기본값으로 두고, 플래그로 비교 실험할 수 있게 남긴다.
 */
export type CoreShieldMode = 'ANY_INNER_DOWN' | 'ALL_INNER_DOWN';
export const DEFAULT_CORE_SHIELD_MODE: CoreShieldMode = 'ANY_INNER_DOWN';

/** GDD 4.7 — 중립 오브젝트 */
export const NEUTRALS = {
  CAMP: { spawnAt: 35, respawn: 90, hp: 1500, ad: 40, defense: 15, resist: 15, range: 1.5 },
  SCOUT_NODE: { spawnAt: 150, respawn: 120, hits: 2, visionDuration: 70 },
  SKY_WHALE: {
    spawnAt: 300,
    respawn: 150,
    hp: 7500,
    hpPerMinute: 550,
    defense: 30,
    resist: 30,
    ad: 240,
    range: 3.5,
    buffDuration: 90,
    recallCut: 2,
    moveBonus: 0.04,
  },
  DEEP_WHALE: {
    spawnAt: 600,
    respawn: Infinity,
    hp: 12500,
    defense: 40,
    resist: 40,
    ad: 330,
    range: 4.5,
    buffDuration: 90,
    minionBoost: true,
    structureDamageBonus: 0.15,
  },
} as const;

/** GDD 4.8 — 시야 */
export const VISION = {
  HERO: 12,
  MINION: 9,
  TURRET: 14,
  WARD_RADIUS: 12, // [가정] 정찰핵 시야 반경은 문서 미기재
  WARD_CHARGES: 2,
  WARD_DURATION: 70,
  WARD_RECHARGE: 95,
  WARD_TEAM_LIMIT: 6,
  /** 부시 안 유닛은 5m 내 접근 또는 공격 시 노출 */
  BUSH_REVEAL_RANGE: 5,
} as const;

/** GDD 4.4 — 군중제어 규칙 */
export const CC = {
  /** 동일 대상 6초 내 2회째부터 20% 감소, 최소 0.35초 */
  DIMINISH_WINDOW: 6,
  DIMINISH_RATE: 0.2,
  DIMINISH_FLOOR: 0.35,
  AIRBORNE_MAX: 1.1,
  SLOW_MIN_MOVE_SPEED: 2.0,
} as const;

/** GDD 4.2 — 이동속도 캡 */
export const MOVE_SOFT_CAP = 6.0;
export const MOVE_HARD_CAP = 8.0;
/** GDD 4.2 — 방어/저항 하한 */
export const RESIST_FLOOR = -30;

/** GDD 4.3 — 피해 공식 */
export function mitigation(defense: number, penetration: number): number {
  const r = Math.max(RESIST_FLOOR, defense - penetration);
  return r >= 0 ? 100 / (100 + r) : 2 - 100 / (100 - r);
}

/** GDD 4.2 — 가속 → 쿨타임 */
export function cooldownWithHaste(base: number, haste: number): number {
  return (base * 100) / (100 + haste);
}

/**
 * GDD 3.1 — 재결속(리스폰) 시간.
 * [가정] 문서에 리스폰 표가 없다. 이건 사소한 누락이 아니라 경기 종결 속도를 직접 결정하는 값이다.
 * 첫 측정에서 리스폰이 짧으면 한타를 이겨도 밀지 못해 경기가 30분을 넘겼다.
 * 후반에 전멸이 실점으로 이어지도록 레벨 비례 + 과부하 이후 가중으로 둔다.
 */
export function respawnTime(level: number, matchTime: number): number {
  const base = 5 + level * 2.4;
  const lateMult = matchTime > TIMETABLE.CORE_OVERLOAD ? 1.4 : 1;
  return base * lateMult;
}

/** GDD 6.2 — 전술 주문 [가정: 문서 표 본문 미확보분은 대표 4종으로 축약] */
export const TACTICAL_SPELLS = [
  { id: 'FLASH_FOLD', name: '접힘 도약', cooldown: 150, note: '3.5m 순간 이동' },
  { id: 'HEAL_WEAVE', name: '결 봉합', cooldown: 120, note: '자신과 아군 회복 120(+8% 최대 HP)' },
  { id: 'SPRINT_ECHO', name: '잔향 질주', cooldown: 100, note: '3초 이동 +28%' },
  { id: 'SMITE_CORE', name: '핵 절단', cooldown: 75, note: '중립 오브젝트에 고정 피해 480' },
] as const;

/** GDD 6.1 표 73 — 완성 아이템 24종 (자동 구매 추천 빌드용) */
export const ITEMS: Record<string, ItemSpec> = {
  WEAVE_BLADE: { id: 'WEAVE_BLADE', name: '직조검', cost: 2400, ad: 52, haste: 15, note: '스킬 후 다음 공격 +70% 기본 AD' },
  WAKE_TWIN: { id: 'WAKE_TWIN', name: '항적 쌍검', cost: 2250, ad: 34, attackSpeed: 0.35, note: '이동 후 공격 딜레이 감소' },
  RED_LEDGER: { id: 'RED_LEDGER', name: '붉은 장부', cost: 2500, ad: 46, hp: 280, note: '영웅 피해 12% 지연' },
  TRENCH_HARPOON: { id: 'TRENCH_HARPOON', name: '해구 작살', cost: 2350, ad: 42, penetration: 18, note: '최대 체력 높은 대상 추가 피해' },
  STARPIN_MAG: { id: 'STARPIN_MAG', name: '별못 탄창', cost: 2300, ad: 38, note: '동일 대상 3회 공격 시 40 추가 피해' },
  NAMELESS_SHEATH: { id: 'NAMELESS_SHEATH', name: '무명 칼집', cost: 2550, ad: 55, haste: 10, note: '처치 관여 후 이동 +20%' },
  TIN_LANTERN: { id: 'TIN_LANTERN', name: '주석의 등불', cost: 2400, sp: 78, haste: 18, note: '서로 다른 스킬 3회 적중 시 추가 피해' },
  PRESSURE_LENS: { id: 'PRESSURE_LENS', name: '압력 렌즈', cost: 2350, sp: 70, penetration: 16, note: '6m 밖 스킬 피해 +8%' },
  MYCEL_CHALICE: { id: 'MYCEL_CHALICE', name: '균사 성배', cost: 2250, sp: 58, hp: 250, note: '제어 적중 시 회복' },
  BACKBEAT: { id: 'BACKBEAT', name: '역박 메트로놈', cost: 2450, sp: 72, haste: 22, note: '궁극기 후 일반 스킬 CD 15% 반환' },
  RUIN_MIRROR: { id: 'RUIN_MIRROR', name: '폐허 거울', cost: 2500, sp: 85, resist: 28, note: '체력 30% 아래 마법 보호막' },
  DEPTH_RECORDER: { id: 'DEPTH_RECORDER', name: '심도 기록계', cost: 2300, sp: 62, note: '스킬 적중 시 자원 회복' },
  GATE_PLATE: { id: 'GATE_PLATE', name: '성문 판갑', cost: 2450, hp: 480, defense: 48, note: '피격 시 공격자 공속 감소' },
  CORAL_HIDE: { id: 'CORAL_HIDE', name: '산호 외피', cost: 2400, hp: 420, resist: 50, note: '제어 후 마법 피해 감소' },
  CRUCIBLE_HEART: { id: 'CRUCIBLE_HEART', name: '도가니 심장', cost: 2500, hp: 520, haste: 15, note: '전투 지속 시 주변 피해' },
  FOLDED_SHIELD: { id: 'FOLDED_SHIELD', name: '접힌 방패', cost: 2350, hp: 380, defense: 30, resist: 30, note: '연속 피격 시 보호막' },
  WHITE_ANCHOR: { id: 'WHITE_ANCHOR', name: '백야 닻', cost: 2550, hp: 450, defense: 35, note: '액티브: 2초 피해 감소' },
  MEMORY_SEAL: { id: 'MEMORY_SEAL', name: '기억 봉인구', cost: 2300, hp: 350, resist: 38, note: '액티브: 침묵/속박 제거' },
  CHORD_RING: { id: 'CHORD_RING', name: '화음 고리', cost: 2200, sp: 45, hp: 260, haste: 15, note: '보호막/회복 후 이동 증가' },
  SCOUT_KNOT: { id: 'SCOUT_KNOT', name: '정찰가의 매듭', cost: 2150, hp: 300, haste: 20, note: '정찰핵 충전 감소' },
  RESONANCE_BELL: { id: 'RESONANCE_BELL', name: '공명 종', cost: 2250, sp: 50, resist: 30, note: '액티브: 주변 아군 보호막' },
  EMPTY_CHAIR: { id: 'EMPTY_CHAIR', name: '빈 의자', cost: 2300, hp: 330, defense: 24, resist: 24, note: '아군 사망 시 이동 증가' },
  VOYAGE_BOOTS: { id: 'VOYAGE_BOOTS', name: '항해화', cost: 900, moveSpeed: 0.55, note: '비전투 시 추가 이동' },
  PRESSURE_BOOTS: { id: 'PRESSURE_BOOTS', name: '압력화', cost: 950, moveSpeed: 0.45, note: '제어 지속 감소' },
};

/**
 * GDD 5장 영웅 명세 — 프로토타입 구현분 5종.
 * 부록 F는 가온·이도·연화·사엘 4종을 선행 제작으로 지정하지만, 5v5 라인 구성을 채우려면
 * 추적자(정글) 1종이 반드시 필요하므로 네루를 추가했다. 5레인 × 5역할이 정확히 맞는다.
 */
export const HEROES: Record<string, HeroSpec> = {
  GAON: {
    id: 'GAON',
    name: '가온',
    role: 'GUARDIAN',
    faction: '나선궁',
    difficulty: '낮음',
    lane: 'TOP',
    color: '#7fb2ff',
    base: { hp: 720, hpPerLevel: 86, ad: 54, adPerLevel: 3.4, defense: 36, defensePerLevel: 3.2, resist: 32, resistPerLevel: 1.6, moveSpeed: 4.4, attackRange: 1.8, attackSpeed: 0.68 },
    build: ['GATE_PLATE', 'PRESSURE_BOOTS', 'FOLDED_SHIELD', 'CRUCIBLE_HEART', 'CORAL_HIDE'],
    abilities: {
      P: { slot: 'P', name: '문턱의 맹세', cooldown: [12], targeting: 'SELF', description: '적 이동 방해 시 4초간 45(+5% 최대 HP) 보호막. 대상당 12초.' },
      Q: { slot: 'Q', name: '빗장', cooldown: [9, 8, 7, 6], baseDamage: [70, 105, 140, 175], adRatio: 0.45, range: 4.5, damageType: 'PHYSICAL', targeting: 'DIRECTION', castLock: 0.25, description: '전방 4.5m 밀치기 0.7초.' },
      W: { slot: 'W', name: '안전구역', cooldown: [15], range: 3.5, targeting: 'SELF', description: '3초간 반경 3.5m 아군 피해 감소 10/12/14/16%.' },
      E: { slot: 'E', name: '접힌 문', cooldown: [18, 17, 16, 15], range: 4, targeting: 'POSITION', castLock: 0.2, description: '4m 돌진 후 3초간 통과 불가 벽 생성.' },
      R: { slot: 'R', name: '귀환 금지', cooldown: [85, 70], baseDamage: [150, 250], spRatio: 0.6, range: 4.5, damageType: 'MAGIC', targeting: 'SELF', telegraph: 0.25, description: '반경 4.5m 적을 1.5m 당기고 2.5초간 첫 이동기 무효화.' },
    },
  },
  NERU: {
    id: 'NERU',
    name: '네루',
    role: 'STALKER',
    faction: '폐허의 합창',
    difficulty: '높음',
    lane: 'JUNGLE',
    color: '#c48bff',
    base: { hp: 590, hpPerLevel: 76, ad: 66, adPerLevel: 4.0, defense: 27, defensePerLevel: 2.6, resist: 29, resistPerLevel: 1.4, moveSpeed: 4.7, attackRange: 1.8, attackSpeed: 0.78 },
    build: ['WEAVE_BLADE', 'VOYAGE_BOOTS', 'NAMELESS_SHEATH', 'TRENCH_HARPOON', 'RED_LEDGER'],
    abilities: {
      P: { slot: 'P', name: '빈 자리', cooldown: [10], adRatio: 0.25, baseDamage: [40], damageType: 'TRUE', targeting: 'SELF', description: '스킬 3회 적중 시 공백 4초. 공백 대상 공격에 40(+25% AD) 고정 피해.' },
      Q: { slot: 'Q', name: '빠진 장면', cooldown: [6], baseDamage: [70, 105, 140, 175], adRatio: 0.85, range: 5, damageType: 'PHYSICAL', targeting: 'DIRECTION', castLock: 0.2, description: '직선 5m 베기. 끝 1m 적중 시 표식 2개.' },
      W: { slot: 'W', name: '기록 삭제', cooldown: [18, 17, 16, 15], targeting: 'SELF', description: '위치 저장 후 2.5초 뒤 또는 재사용 시 복귀. 약화 1개 제거.' },
      E: { slot: 'E', name: '무명 도약', cooldown: [13], baseDamage: [45, 70, 95, 120], adRatio: 0.35, range: 5.5, damageType: 'PHYSICAL', targeting: 'UNIT', description: '대상 뒤로 순간 이동. 공백 대상 처치 관여 시 초기화.' },
      R: { slot: 'R', name: '존재하지 않은 결말', cooldown: [80, 65], baseDamage: [220, 360], adRatio: 1.0, range: 6, damageType: 'PHYSICAL', targeting: 'UNIT', telegraph: 1.2, description: '1.2초 후 처형. 6m 이상 멀어지면 취소되고 CD 40% 반환.' },
    },
  },
  SAEL: {
    id: 'SAEL',
    name: '사엘',
    role: 'MAGE',
    faction: '나선궁',
    difficulty: '중간',
    lane: 'MID',
    color: '#ffb861',
    base: { hp: 570, hpPerLevel: 72, ad: 47, adPerLevel: 2.6, defense: 25, defensePerLevel: 2.5, resist: 30, resistPerLevel: 1.4, moveSpeed: 4.4, attackRange: 5.8, attackSpeed: 0.7 },
    build: ['TIN_LANTERN', 'VOYAGE_BOOTS', 'PRESSURE_LENS', 'BACKBEAT', 'RUIN_MIRROR'],
    abilities: {
      P: { slot: 'P', name: '주석', cooldown: [0], baseDamage: [75], spRatio: 0.35, damageType: 'MAGIC', targeting: 'SELF', description: '서로 다른 3문양 완성 시 75(+35% SP) 추가 피해와 0.6초 침묵.' },
      Q: { slot: 'Q', name: '첫 문장', cooldown: [5], baseDamage: [70, 105, 140, 175], spRatio: 0.55, range: 7.5, damageType: 'MAGIC', targeting: 'DIRECTION', castLock: 0.25, description: '직선 불꽃. 첫 대상 뒤로 피해 20% 감소.' },
      W: { slot: 'W', name: '여백 화염', cooldown: [9], baseDamage: [60, 95, 130, 165], spRatio: 0.5, range: 8, damageType: 'MAGIC', targeting: 'POSITION', telegraph: 1.0, description: '1초 후 폭발, 중심 35% 둔화 1.2초.' },
      E: { slot: 'E', name: '금서 넘기기', cooldown: [13, 12, 11, 10], baseDamage: [45, 70, 95, 120], spRatio: 0.3, range: 2.5, damageType: 'MAGIC', targeting: 'DIRECTION', description: '2.5m 이동하며 원위치에 2초 불꽃 페이지.' },
      R: { slot: 'R', name: '마지막 각주', cooldown: [85, 70], baseDamage: [80, 125], spRatio: 0.25, range: 6, damageType: 'MAGIC', targeting: 'SELF', telegraph: 0.3, description: '6m 내 문양 폭발. 문양당 피해, 3문양 대상은 1초 경직.' },
    },
  },
  IDO: {
    id: 'IDO',
    name: '이도',
    role: 'MARKSMAN',
    faction: '백야 유랑함대',
    difficulty: '낮음',
    lane: 'BOT',
    color: '#8ef0d0',
    base: { hp: 565, hpPerLevel: 74, ad: 57, adPerLevel: 3.5, defense: 25, defensePerLevel: 2.5, resist: 29, resistPerLevel: 1.4, moveSpeed: 4.5, attackRange: 5.6, attackSpeed: 0.9 },
    build: ['STARPIN_MAG', 'VOYAGE_BOOTS', 'WAKE_TWIN', 'TRENCH_HARPOON', 'RED_LEDGER'],
    abilities: {
      P: { slot: 'P', name: '별못', cooldown: [0], targeting: 'SELF', description: '같은 대상 3회 공격 시 별못 5초. 사거리 +0.6m.' },
      Q: { slot: 'Q', name: '궤도 사격', cooldown: [6], baseDamage: [45, 70, 95, 120], adRatio: 0.5, damageType: 'PHYSICAL', targeting: 'SELF', description: '다음 공격 추가 피해. 별못 대상이면 주변 2m에 50%.' },
      W: { slot: 'W', name: '방향표', cooldown: [16, 15, 14, 13], range: 9, targeting: 'DIRECTION', description: '6초간 부채꼴 지역 공개.' },
      E: { slot: 'E', name: '돛줄 이동', cooldown: [12, 11, 10, 9], range: 3, targeting: 'DIRECTION', description: '3m 이동, 다음 기본 공격 준비시간 초기화.' },
      R: { slot: 'R', name: '끝까지 보이는 별', cooldown: [75, 60], range: 9, targeting: 'UNIT', description: '별못 대상 8초 지정. 공격속도 25/40%, Q 관통.' },
    },
  },
  YEONHWA: {
    id: 'YEONHWA',
    name: '연화',
    role: 'CONDUCTOR',
    faction: '나선궁',
    difficulty: '중간',
    lane: 'BOT',
    color: '#ff9fd0',
    base: { hp: 600, hpPerLevel: 76, ad: 48, adPerLevel: 2.8, defense: 27, defensePerLevel: 2.6, resist: 33, resistPerLevel: 1.6, moveSpeed: 4.5, attackRange: 5.5, attackSpeed: 0.7 },
    build: ['CHORD_RING', 'VOYAGE_BOOTS', 'RESONANCE_BELL', 'MYCEL_CHALICE', 'CORAL_HIDE'],
    abilities: {
      P: { slot: 'P', name: '화음', cooldown: [0], targeting: 'SELF', description: '최근 지원한 아군과 6초 연결. 8m 내 이동 4%, 회복/보호막 15% 전달.' },
      Q: { slot: 'Q', name: '맑은 음', cooldown: [6], baseDamage: [60, 90, 120, 150], spRatio: 0.4, range: 7, damageType: 'MAGIC', targeting: 'DIRECTION', description: '직선 음파. 아군 50/75/100/125(+35% SP) 회복.' },
      W: { slot: 'W', name: '겹잎 방패', cooldown: [10], baseDamage: [80, 120, 160, 200], spRatio: 0.55, range: 7, targeting: 'UNIT', description: '3초 보호막. 파괴되지 않으면 잔여 50% 회복.' },
      E: { slot: 'E', name: '불협 끊기', cooldown: [14, 13, 12, 11], range: 7, targeting: 'POSITION', telegraph: 1.2, description: '25% 둔화 후 1.2초 뒤 중심 0.7초 침묵.' },
      R: { slot: 'R', name: '모두의 숨', cooldown: [95, 80], baseDamage: [180, 300], spRatio: 0.5, range: 6, targeting: 'SELF', description: '5초간 아군 피해 15% 감소. 체력 20% 미만 아군 회복.' },
    },
  },
};

export const HERO_ORDER = ['GAON', 'NERU', 'SAEL', 'IDO', 'YEONHWA'] as const;

/** GDD 3.5 — 역할별 초기 위치 */
export const ROLE_LANE: Record<string, 'TOP' | 'MID' | 'BOT' | 'JUNGLE'> = {
  GUARDIAN: 'TOP',
  STALKER: 'JUNGLE',
  MAGE: 'MID',
  MARKSMAN: 'BOT',
  CONDUCTOR: 'BOT',
};
