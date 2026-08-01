// 영웅 스킬 구현 — GDD 5장
//
// 수치는 문서 표를 그대로 옮겼다. 문서가 표현만 규정하고 구현을 지정하지 않은 부분
// (예: 이도 W의 부채꼴 공개 범위, 연화 P의 "지원한 아군" 판정)은 [단순화] 주석을 달았다.
// 게임감에 영향을 주는 축약이므로 플레이테스트 후 되돌릴 후보 목록이기도 하다.

import { HEROES } from './config';
import type { CcKind, Unit, Vec2 } from './types';
import { World, add, dist, norm, scale } from './sim';

type Slot = 'Q' | 'W' | 'E' | 'R';

// ---------------------------------------------------------------------------
// 공용 헬퍼
// ---------------------------------------------------------------------------

function abilityDamage(world: World, u: Unit, slot: Slot | 'P', level: number): number {
  const spec = HEROES[u.heroId!].abilities[slot];
  const idx = Math.max(0, Math.min((spec.baseDamage?.length ?? 1) - 1, level - 1));
  const base = spec.baseDamage?.[idx] ?? 0;
  void world;
  return base + u.stats.ad * (spec.adRatio ?? 0) + u.stats.sp * (spec.spRatio ?? 0);
}

function hostilesInRadius(world: World, u: Unit, center: Vec2, radius: number): Unit[] {
  const out: Unit[] = [];
  for (const o of world.units.values()) {
    if (!o.alive || o.team === u.team || o.kind === 'WARD') continue;
    if (o.kind === 'CORE' && !world.coreVulnerable(o.team)) continue;
    if (dist(center, o.pos) <= radius + o.radius) out.push(o);
  }
  return out;
}

function alliesInRadius(world: World, u: Unit, center: Vec2, radius: number, heroesOnly = true): Unit[] {
  const out: Unit[] = [];
  for (const o of world.units.values()) {
    if (!o.alive || o.team !== u.team) continue;
    if (heroesOnly && o.kind !== 'HERO') continue;
    if (dist(center, o.pos) <= radius + o.radius) out.push(o);
  }
  return out;
}

/** 직선(사각형) 판정. 벽에 막히면 그 지점까지만. */
function lineHit(world: World, u: Unit, dir: Vec2, range: number, halfWidth: number): Unit[] {
  const d = norm(dir);
  const end = add(u.pos, scale(d, range));
  const hits: Unit[] = [];
  for (const o of world.units.values()) {
    if (!o.alive || o.team === u.team || o.kind === 'WARD') continue;
    if (o.kind === 'CORE' && !world.coreVulnerable(o.team)) continue;
    const rel = { x: o.pos.x - u.pos.x, y: o.pos.y - u.pos.y };
    const along = rel.x * d.x + rel.y * d.y;
    if (along < 0 || along > range) continue;
    const perp = Math.abs(rel.x * -d.y + rel.y * d.x);
    if (perp > halfWidth + o.radius) continue;
    if (!world.field.lineOfSight(u.pos, o.pos)) continue;
    hits.push(o);
  }
  void end;
  return hits.sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos));
}

/** 벽을 통과하지 않는 이동(돌진/도약) */
function moveTo(world: World, u: Unit, target: Vec2, maxDist: number): void {
  const d = { x: target.x - u.pos.x, y: target.y - u.pos.y };
  const len = Math.min(maxDist, Math.hypot(d.x, d.y));
  const dir = norm(d);
  // 벽을 만나기 직전까지 전진
  let travelled = 0;
  const stepSize = 0.4;
  while (travelled + stepSize <= len) {
    const next = add(u.pos, scale(dir, stepSize));
    if (!world.field.isFree(next, u.radius)) break;
    u.pos = next;
    travelled += stepSize;
  }
  if (travelled > 0) u.facing = dir;
}

function nearestEnemyHero(world: World, u: Unit, maxRange: number): Unit | null {
  let best: Unit | null = null;
  let bestD = maxRange;
  for (const o of world.units.values()) {
    if (!o.alive || o.kind !== 'HERO' || o.team === u.team) continue;
    const d = dist(u.pos, o.pos);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

function setMark(target: Unit, key: string, sourceId: number, duration: number, world: World, stacks = 1): void {
  target.marks.set(key, { key, stacks, expiresAt: world.time + duration, sourceId });
}

// ---------------------------------------------------------------------------
// 시전 진입점
// ---------------------------------------------------------------------------

export function castAbility(world: World, u: Unit, slot: Slot, aim: Vec2 | null, targetId?: number): boolean {
  const level = u.skillLevels[slot] ?? 0;
  const dir = aim ? norm({ x: aim.x - u.pos.x, y: aim.y - u.pos.y }) : u.facing;
  switch (u.heroId) {
    case 'GAON':
      return castGaon(world, u, slot, level, dir, aim);
    case 'NERU':
      return castNeru(world, u, slot, level, dir, aim, targetId);
    case 'SAEL':
      return castSael(world, u, slot, level, dir, aim);
    case 'IDO':
      return castIdo(world, u, slot, level, dir, aim, targetId);
    case 'YEONHWA':
      return castYeonhwa(world, u, slot, level, dir, aim, targetId);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// 가온, 마지막 문지기 — 수호자
// ---------------------------------------------------------------------------

function castGaon(world: World, u: Unit, slot: Slot, level: number, dir: Vec2, aim: Vec2 | null): boolean {
  if (slot === 'Q') {
    // 빗장: 전방 4.5m를 방패로 밀어 피해와 0.7초 밀치기
    const hits = lineHit(world, u, dir, 4.5, 1.3);
    const dmg = abilityDamage(world, u, 'Q', level);
    for (const h of hits) {
      world.dealDamage(u, h, dmg, { type: 'PHYSICAL', label: 'Q' });
      world.displace(h, dir, 1.2);
      world.applyCc(u, h, 'AIRBORNE', 0.7);
      world.onAbilityHit(u, h, 'Q');
    }
    u.facing = dir;
    return true;
  }
  if (slot === 'W') {
    // 안전구역: 3초간 반경 3.5m 아군 피해 감소 10/12/14/16%
    const reduction = [0.1, 0.12, 0.14, 0.16][Math.min(3, Math.max(0, level - 1))];
    world.addZone({
      ownerId: u.id,
      team: u.team,
      pos: { ...u.pos },
      radius: 3.5,
      fuse: 0,
      duration: 3,
      kind: 'SAFE_ZONE',
      damage: reduction,
      damageType: 'TRUE',
      level,
    });
    // 가온 본인은 둔화 면역
    u.statuses = u.statuses.filter((s) => s.kind !== 'SLOW');
    setMark(u, 'slowImmune', u.id, 3, world);
    return true;
  }
  if (slot === 'E') {
    // 접힌 문: 4m 돌진 후 3초간 통과 불가 벽(길이 3m)
    const target = aim ?? add(u.pos, scale(dir, 4));
    moveTo(world, u, target, 4);
    const perp = { x: -dir.y, y: dir.x };
    world.barriers.push({
      a: add(u.pos, scale(perp, 1.5)),
      b: add(u.pos, scale(perp, -1.5)),
      expiresAt: world.time + 3,
      team: u.team,
      hits: 3,
    });
    return true;
  }
  if (slot === 'R') {
    // 귀환 금지: 반경 4.5m 적을 중앙으로 1.5m 당기고 피해. 2.5초간 첫 이동기 무효화.
    const dmg = abilityDamage(world, u, 'R', level);
    const hits = hostilesInRadius(world, u, u.pos, 4.5);
    for (const h of hits) {
      world.dealDamage(u, h, dmg, { type: 'MAGIC', label: 'R' });
      const pull = norm({ x: u.pos.x - h.pos.x, y: u.pos.y - h.pos.y });
      world.displace(h, pull, 1.5);
      setMark(h, 'noEscape', u.id, 2.5, world);
      world.onAbilityHit(u, h, 'R');
    }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 네루, 삭제된 셋째 — 추적자
// ---------------------------------------------------------------------------

function castNeru(world: World, u: Unit, slot: Slot, level: number, dir: Vec2, aim: Vec2 | null, targetId?: number): boolean {
  if (slot === 'Q') {
    // 빠진 장면: 직선 5m. 끝 1m 적중 시 표식 2개.
    const hits = lineHit(world, u, dir, 5, 1.1);
    const dmg = abilityDamage(world, u, 'Q', level);
    for (const h of hits) {
      world.dealDamage(u, h, dmg, { type: 'PHYSICAL', label: 'Q' });
      const far = dist(u.pos, h.pos) >= 4;
      world.onAbilityHit(u, h, 'Q');
      if (far) world.onAbilityHit(u, h, 'Q'); // 끝 적중 = 표식 2개
    }
    u.facing = dir;
    return true;
  }
  if (slot === 'W') {
    // 기록 삭제: 위치 저장 후 2.5초 뒤 또는 재사용 시 복귀. 약화 1개 제거.
    const saved = u.scratch.recordPos as Vec2 | undefined;
    if (saved && (u.scratch.recordUntil as number) > world.time) {
      u.pos = world.field.nearestFree(saved, u.radius);
      u.scratch.recordPos = undefined;
      u.scratch.recordUntil = undefined;
      const idx = u.statuses.findIndex((s) => s.kind !== 'SLOW');
      if (idx >= 0) u.statuses.splice(idx, 1);
      else if (u.statuses.length) u.statuses.shift();
      return true;
    }
    u.scratch.recordPos = { ...u.pos };
    u.scratch.recordUntil = world.time + 2.5;
    return true;
  }
  if (slot === 'E') {
    // 무명 도약: 대상 뒤로 2.5m 순간 이동
    const target = targetId ? world.units.get(targetId) : nearestEnemyHero(world, u, 5.5);
    if (!target || !target.alive || dist(u.pos, target.pos) > 5.5) return false;
    const behind = add(target.pos, scale(norm({ x: target.pos.x - u.pos.x, y: target.pos.y - u.pos.y }), 2.5));
    u.pos = world.field.nearestFree(behind, u.radius);
    const dmg = abilityDamage(world, u, 'E', level);
    world.dealDamage(u, target, dmg, { type: 'PHYSICAL', label: 'E' });
    world.onAbilityHit(u, target, 'E');
    return true;
  }
  if (slot === 'R') {
    // 존재하지 않은 결말: 1.2초 후 처형 시도. 6m 이상 멀어지면 취소 + CD 40% 반환.
    const target = targetId ? world.units.get(targetId) : nearestEnemyHero(world, u, 6);
    if (!target || !target.alive || target.kind !== 'HERO') return false;
    u.scratch.ultTargetId = target.id;
    u.scratch.ultAt = world.time + 1.2;
    u.scratch.ultLevel = level;
    setMark(target, 'execution', u.id, 1.4, world);
    return true;
  }
  void dir;
  void aim;
  return false;
}

// ---------------------------------------------------------------------------
// 사엘, 무명 도서관의 불 — 술사
// ---------------------------------------------------------------------------

function castSael(world: World, u: Unit, slot: Slot, level: number, dir: Vec2, aim: Vec2 | null): boolean {
  if (slot === 'Q') {
    // 첫 문장: 직선 불꽃, 첫 대상 뒤로 피해 20% 감소
    const hits = lineHit(world, u, dir, 7.5, 1.0);
    const dmg = abilityDamage(world, u, 'Q', level);
    hits.forEach((h, i) => {
      world.dealDamage(u, h, i === 0 ? dmg : dmg * 0.8, { type: 'MAGIC', label: 'Q' });
      world.onAbilityHit(u, h, 'Q');
    });
    u.facing = dir;
    return true;
  }
  if (slot === 'W') {
    // 여백 화염: 1초 후 폭발, 중심 35% 둔화 1.2초 (GDD 3.8 예고 250ms 이상 충족)
    const center = aim ?? add(u.pos, scale(dir, 5));
    if (dist(u.pos, center) > 8) return false;
    world.addZone({
      ownerId: u.id,
      team: u.team,
      pos: { ...center },
      radius: 2.6,
      fuse: 1.0,
      duration: 0.3,
      kind: 'BLANK_FLAME',
      damage: abilityDamage(world, u, 'W', level),
      damageType: 'MAGIC',
      level,
    });
    return true;
  }
  if (slot === 'E') {
    // 금서 넘기기: 2.5m 이동하며 원래 위치에 2초 불꽃 페이지
    const origin = { ...u.pos };
    moveTo(world, u, add(u.pos, scale(dir, 2.5)), 2.5);
    world.addZone({
      ownerId: u.id,
      team: u.team,
      pos: origin,
      radius: 1.6,
      fuse: 0,
      duration: 2,
      kind: 'FLAME_PAGE',
      damage: abilityDamage(world, u, 'E', level),
      damageType: 'MAGIC',
      level,
    });
    return true;
  }
  if (slot === 'R') {
    // 마지막 각주: 6m 내 모든 적의 문양 폭발. 문양당 피해. 3문양은 1초 경직.
    const per = abilityDamage(world, u, 'R', level);
    const hits = hostilesInRadius(world, u, u.pos, 6);
    let any = false;
    for (const h of hits) {
      const mark = h.marks.get('annotation');
      const glyphs = mark?.glyphs?.size ?? 0;
      if (glyphs <= 0) continue;
      any = true;
      world.dealDamage(u, h, per * glyphs, { type: 'MAGIC', label: 'R' });
      if (glyphs >= 3) world.applyCc(u, h, 'STUN', 1.0);
      h.marks.delete('annotation');
    }
    // 문양이 없어도 시전은 성립한다(문서상 조건부 소모가 아님)
    void any;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 이도, 별못 사수 — 사수
// ---------------------------------------------------------------------------

function castIdo(world: World, u: Unit, slot: Slot, level: number, dir: Vec2, aim: Vec2 | null, targetId?: number): boolean {
  if (slot === 'Q') {
    // 궤도 사격: 다음 공격이 추가 피해. 별못 대상이면 주변 2m에 50%.
    u.scratch.orbitalUntil = world.time + 6;
    u.scratch.orbitalLevel = level;
    return true;
  }
  if (slot === 'W') {
    // 방향표: 6초간 부채꼴 지역 공개
    // [단순화] 부채꼴 대신 조준 지점에 6초짜리 시야 유닛을 둔다.
    const center = aim ?? add(u.pos, scale(dir, 7));
    world.addZone({
      ownerId: u.id,
      team: u.team,
      pos: { ...center },
      radius: 5,
      fuse: 0,
      duration: 6,
      kind: 'REVEAL',
      damage: 0,
      damageType: 'TRUE',
      level,
    });
    return true;
  }
  if (slot === 'E') {
    // 돛줄 이동: 3m 이동, 다음 기본 공격 준비시간 초기화
    moveTo(world, u, add(u.pos, scale(dir, 3)), 3);
    u.attackCooldown = 0;
    return true;
  }
  if (slot === 'R') {
    // 끝까지 보이는 별: 별못 대상 8초 지정. 공격속도 25/40%.
    const target = targetId ? world.units.get(targetId) : nearestEnemyHero(world, u, 9);
    if (!target || !target.alive) return false;
    setMark(target, 'guidingStar', u.id, 8, world);
    u.scratch.starUntil = world.time + 8;
    u.scratch.starBonus = level >= 2 ? 0.4 : 0.25;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 연화, 두 목소리의 조율자 — 조율자
// ---------------------------------------------------------------------------

function castYeonhwa(world: World, u: Unit, slot: Slot, level: number, dir: Vec2, aim: Vec2 | null, targetId?: number): boolean {
  const lvlIdx = Math.min(3, Math.max(0, level - 1));
  if (slot === 'Q') {
    // 맑은 음: 직선 음파. 적 피해 + 아군 회복.
    const dmg = abilityDamage(world, u, 'Q', level);
    const hits = lineHit(world, u, dir, 7, 1.0);
    for (const h of hits) {
      world.dealDamage(u, h, dmg, { type: 'MAGIC', label: 'Q' });
      world.onAbilityHit(u, h, 'Q');
    }
    const healBase = [50, 75, 100, 125][lvlIdx] + u.stats.sp * 0.35;
    const end = add(u.pos, scale(dir, 7));
    for (const a of alliesInRadius(world, u, midpoint(u.pos, end), 4.2)) {
      world.heal(u, a, healBase * chordMultiplier(u, a, world));
      linkChord(u, a, world);
    }
    u.facing = dir;
    return true;
  }
  if (slot === 'W') {
    // 겹잎 방패: 3초 보호막. 파괴되지 않으면 잔여 50% 회복.
    let target = targetId ? world.units.get(targetId) : null;
    if (!target || target.team !== u.team || !target.alive) {
      const allies = alliesInRadius(world, u, u.pos, 7).filter((a) => a.id !== u.id);
      target = allies.sort((a, b) => a.stats.hp / a.stats.maxHp - b.stats.hp / b.stats.maxHp)[0] ?? u;
    }
    const amount = ([80, 120, 160, 200][lvlIdx] + u.stats.sp * 0.55) * chordMultiplier(u, target, world);
    world.addShield(u, target, amount, 3);
    target.scratch.leafShieldAt = world.time;
    linkChord(u, target, world);
    return true;
  }
  if (slot === 'E') {
    // 불협 끊기: 25% 둔화 후 1.2초 뒤 중심 0.7초 침묵
    const center = aim ?? add(u.pos, scale(dir, 5));
    if (dist(u.pos, center) > 7) return false;
    for (const h of hostilesInRadius(world, u, center, 2.8)) {
      world.applyCc(u, h, 'SLOW', 1.2, 0.25);
      world.onAbilityHit(u, h, 'E');
    }
    world.addZone({
      ownerId: u.id,
      team: u.team,
      pos: { ...center },
      radius: 1.6,
      fuse: 1.2,
      duration: 0.2,
      kind: 'DISSONANCE',
      damage: 0,
      damageType: 'MAGIC',
      level,
    });
    return true;
  }
  if (slot === 'R') {
    // 모두의 숨: 5초간 주변 아군 피해 15% 감소 + 위급 아군 1회 회복
    world.addZone({
      ownerId: u.id,
      team: u.team,
      pos: { ...u.pos },
      radius: 6,
      fuse: 0,
      duration: 5,
      kind: 'BREATH',
      damage: 0.15,
      damageType: 'TRUE',
      level,
    });
    u.scratch.breathUntil = world.time + 5;
    u.scratch.breathHeal = ([180, 300][Math.min(1, level - 1)] ?? 180) + u.stats.sp * 0.5;
    return true;
  }
  return false;
}

function midpoint(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** 연화 P 화음 — 연결된 아군에게 회복/보호막 15% 추가 전달 */
function chordMultiplier(u: Unit, target: Unit, world: World): number {
  const chord = u.marks.get('chord');
  if (chord && chord.expiresAt > world.time && chord.sourceId === target.id && dist(u.pos, target.pos) <= 8) return 1.15;
  return 1;
}
function linkChord(u: Unit, ally: Unit, world: World): void {
  if (ally.id === u.id) return;
  u.marks.set('chord', { key: 'chord', stacks: 1, expiresAt: world.time + 6, sourceId: ally.id });
}

// ---------------------------------------------------------------------------
// 적중 후처리 — 표식 계열 패시브
// ---------------------------------------------------------------------------

export function onAbilityHit(world: World, source: Unit, target: Unit, slot: string): void {
  // 사엘 주석은 미니언에도 기록되지만, 나머지 표식은 영웅 대상에서만 의미를 갖는다.
  if (source.heroId === 'SAEL' && (slot === 'Q' || slot === 'W' || slot === 'E')) {
    // 주석: Q/W/E 문양 5초 기록. 서로 다른 3문양 완성 시 추가 피해 + 0.6초 침묵.
    const existing = target.marks.get('annotation');
    const glyphs = existing && existing.expiresAt > world.time ? existing.glyphs ?? new Set<'Q' | 'W' | 'E'>() : new Set<'Q' | 'W' | 'E'>();
    glyphs.add(slot as 'Q' | 'W' | 'E');
    target.marks.set('annotation', {
      key: 'annotation',
      stacks: glyphs.size,
      expiresAt: world.time + 5,
      sourceId: source.id,
      glyphs,
    });
    if (glyphs.size >= 3) {
      const spec = HEROES.SAEL.abilities.P;
      const dmg = (spec.baseDamage?.[0] ?? 75) + source.stats.sp * (spec.spRatio ?? 0.35);
      world.dealDamage(source, target, dmg, { type: 'MAGIC', label: 'P' });
      world.applyCc(source, target, 'SILENCE', 0.6);
      target.marks.delete('annotation');
    }
    return;
  }

  if (source.heroId === 'NERU' && target.kind === 'HERO') {
    // 빈 자리: 스킬 3회 적중 시 공백 4초
    const key = 'neruStacks';
    const m = target.marks.get(key);
    const stacks = m && m.expiresAt > world.time ? m.stacks + 1 : 1;
    if (stacks >= 3) {
      target.marks.delete(key);
      setMark(target, 'blank', source.id, 4, world);
    } else {
      setMark(target, key, source.id, 6, world, stacks);
    }
  }
}

export function onBasicAttackHit(world: World, u: Unit, target: Unit): void {
  // 이도 별못: 같은 대상 3회 공격 시 별못 5초
  if (u.heroId === 'IDO') {
    const key = `idoHits`;
    const m = target.marks.get(key);
    const same = m && m.sourceId === u.id && m.expiresAt > world.time;
    const stacks = same ? m!.stacks + 1 : 1;
    if (stacks >= 3) {
      setMark(target, 'starpin', u.id, 5, world);
      target.marks.delete(key);
    } else {
      setMark(target, key, u.id, 4, world, stacks);
    }

    // 궤도 사격 소모
    if ((u.scratch.orbitalUntil as number) > world.time) {
      u.scratch.orbitalUntil = 0;
      const level = (u.scratch.orbitalLevel as number) ?? 1;
      const bonus = abilityDamage(world, u, 'Q', level);
      world.dealDamage(u, target, bonus, { type: 'PHYSICAL', label: 'Q' });
      const pinned = target.marks.get('starpin');
      if (pinned && pinned.expiresAt > world.time) {
        for (const o of hostilesInRadius(world, u, target.pos, 2)) {
          if (o.id === target.id) continue;
          world.dealDamage(u, o, bonus * 0.5, { type: 'PHYSICAL', label: 'Q' });
        }
      }
    }
  }

  // 네루 빈 자리: 공백 대상 공격에 고정 피해
  if (u.heroId === 'NERU') {
    const blank = target.marks.get('blank');
    if (blank && blank.sourceId === u.id && blank.expiresAt > world.time) {
      const cd = target.marks.get('blankUsed');
      if (!cd || cd.expiresAt <= world.time) {
        const spec = HEROES.NERU.abilities.P;
        const dmg = (spec.baseDamage?.[0] ?? 40) + u.stats.ad * (spec.adRatio ?? 0.25);
        world.dealDamage(u, target, dmg, { type: 'TRUE', label: 'P' });
        setMark(target, 'blankUsed', u.id, 10, world);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 매 틱 패시브 처리
// ---------------------------------------------------------------------------

export function tickHeroPassives(world: World, u: Unit, ev?: { ccApplied?: boolean }): void {
  if (u.kind !== 'HERO' || !u.heroId) return;

  // 가온 P 문턱의 맹세: 적 이동 방해 시 보호막
  // [단순화] 문서는 "대상당 12초"지만 프로토타입은 시전자 기준 12초 내부 쿨다운으로 처리한다.
  if (u.heroId === 'GAON' && ev?.ccApplied) {
    const cd = u.marks.get('oathCd');
    if (!cd || cd.expiresAt <= world.time) {
      world.addShield(u, u, 45 + u.stats.maxHp * 0.05, 4);
      setMark(u, 'oathCd', u.id, 12, world);
    }
  }
  if (ev) return;

  // 네루 W 자동 복귀
  if (u.heroId === 'NERU') {
    const until = u.scratch.recordUntil as number | undefined;
    if (until !== undefined && world.time >= until) {
      const saved = u.scratch.recordPos as Vec2 | undefined;
      if (saved) u.pos = world.field.nearestFree(saved, u.radius);
      u.scratch.recordPos = undefined;
      u.scratch.recordUntil = undefined;
    }
    // R 처형 판정
    const at = u.scratch.ultAt as number | undefined;
    if (at !== undefined && world.time >= at) {
      const target = world.units.get((u.scratch.ultTargetId as number) ?? -1);
      const level = (u.scratch.ultLevel as number) ?? 1;
      u.scratch.ultAt = undefined;
      u.scratch.ultTargetId = undefined;
      if (target && target.alive && dist(u.pos, target.pos) <= 6) {
        world.dealDamage(u, target, abilityDamage(world, u, 'R', level), { type: 'PHYSICAL', label: 'R' });
        target.marks.delete('execution');
      } else {
        // 취소: CD 40% 반환
        u.cooldowns.R = (u.cooldowns.R ?? 0) * 0.6;
        target?.marks.delete('execution');
      }
    }
  }

  // 이도 R 공격속도
  if (u.heroId === 'IDO') {
    const until = (u.scratch.starUntil as number) ?? 0;
    const applied = u.scratch.starApplied === true;
    if (until > world.time && !applied) {
      u.stats.attackSpeed *= 1 + ((u.scratch.starBonus as number) ?? 0.25);
      u.scratch.starApplied = true;
    } else if (until <= world.time && applied) {
      u.stats.attackSpeed /= 1 + ((u.scratch.starBonus as number) ?? 0.25);
      u.scratch.starApplied = false;
    }
  }

  // 연화 W 겹잎 방패: 파괴되지 않고 만료되면 잔여 50% 회복
  if (u.scratch.leafShieldAt !== undefined) {
    const at = u.scratch.leafShieldAt as number;
    if (world.time >= at + 3) {
      const remaining = u.shields.filter((s) => s.expiresAt <= world.time + 0.05).reduce((a, b) => a + b.amount, 0);
      if (remaining > 0) world.heal(u, u, remaining * 0.5);
      u.scratch.leafShieldAt = undefined;
    }
  }

  // 연화 R 모두의 숨: 기간 중 체력 20% 미만으로 떨어진 아군 1회 회복
  if (u.heroId === 'YEONHWA') {
    const until = (u.scratch.breathUntil as number) ?? 0;
    if (until > world.time) {
      const heal = (u.scratch.breathHeal as number) ?? 180;
      for (const a of alliesInRadius(world, u, u.pos, 6)) {
        if (a.stats.hp / a.stats.maxHp >= 0.2) continue;
        const used = a.marks.get('breathUsed');
        if (used && used.expiresAt > world.time) continue;
        world.heal(u, a, heal);
        setMark(a, 'breathUsed', u.id, 30, world);
      }
    }
  }
}

/** 이동 방해 계열인가 (가온 P 판정용) */
export function isMovementImpairing(kind: CcKind): boolean {
  return kind === 'STUN' || kind === 'ROOT' || kind === 'AIRBORNE' || kind === 'SLOW' || kind === 'SUPPRESS';
}
