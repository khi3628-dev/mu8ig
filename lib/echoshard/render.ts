// 캔버스 렌더러
//
// GDD 3.8 가독성 기준을 프로토타입 수준에서 지킨다:
//  - 진영은 색상만이 아니라 외곽선 형태로도 구분한다(색각 의존 금지)
//  - 위험 예고(텔레그래프)는 바닥에 먼저 그린다
//  - 영웅 실루엣이 화면에서 충분한 크기를 차지하도록 카메라 배율을 잡는다

import { MAP_SIZE } from './config';
import { BASE, BUSHES, CELL, FOLD_ZONES, GRID, LANE_PATH, LANES } from './map';
import type { Team, Unit, Vec2 } from './types';
import { World, dist } from './sim';

export interface Camera {
  center: Vec2;
  /** 픽셀 / 미터 */
  scale: number;
}

const COLORS = {
  bg: '#080b12',
  // 통행 가능/불가는 명도 차이가 충분해야 한다. 어두운 화면에서 벽과 길이 구분되지 않으면
  // 접힘으로 길이 열린 것도 알아볼 수 없다.
  ground: '#26334a',
  groundAlt: '#2b3853',
  wall: '#0a0e16',
  wallEdge: '#1e2941',
  bush: '#1d3a2a',
  river: '#16283f',
  foldClosed: '#2a1d2e',
  foldOpen: '#3a2c1a',
  blue: '#4da3ff',
  red: '#ff5f6d',
  neutral: '#c9b06a',
  text: '#e8edf7',
  dim: '#8b97ad',
};

export function teamColor(team: Team, viewer: Team): string {
  return team === viewer ? COLORS.blue : COLORS.red;
}

/** 정적 지형을 오프스크린에 한 번만 그린다. 접힘 때 다시 그린다. */
export function renderTerrain(world: World, pxPerMeter = 5): HTMLCanvasElement {
  const size = MAP_SIZE * pxPerMeter;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;

  g.fillStyle = COLORS.wall;
  g.fillRect(0, 0, size, size);

  // 통행 가능 셀
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      if (world.field.wall[gy * GRID + gx]) continue;
      const x = gx * CELL * pxPerMeter;
      const y = gy * CELL * pxPerMeter;
      g.fillStyle = (gx + gy) % 2 === 0 ? COLORS.ground : COLORS.groundAlt;
      g.fillRect(x, y, CELL * pxPerMeter + 1, CELL * pxPerMeter + 1);
    }
  }

  // 라인 안내선
  g.lineWidth = 1.5 * pxPerMeter;
  g.strokeStyle = 'rgba(120,150,200,0.10)';
  for (const lane of LANES) {
    const path = LANE_PATH[lane];
    g.beginPath();
    g.moveTo(path[0].x * pxPerMeter, path[0].y * pxPerMeter);
    for (let i = 1; i < path.length; i++) g.lineTo(path[i].x * pxPerMeter, path[i].y * pxPerMeter);
    g.stroke();
  }

  // 접힘 구역: 닫혀 있으면 균열 표시, 열렸으면 바닥색
  for (const z of FOLD_ZONES) {
    g.fillStyle = world.field.folded ? COLORS.foldOpen : COLORS.foldClosed;
    g.globalAlpha = world.field.folded ? 0.35 : 0.75;
    g.fillRect(z.min.x * pxPerMeter, z.min.y * pxPerMeter, (z.max.x - z.min.x) * pxPerMeter, (z.max.y - z.min.y) * pxPerMeter);
    g.globalAlpha = 1;
    g.strokeStyle = world.field.folded ? '#7a5c22' : '#5c2f4a';
    g.lineWidth = 2;
    g.setLineDash(world.field.folded ? [] : [6, 5]);
    g.strokeRect(z.min.x * pxPerMeter, z.min.y * pxPerMeter, (z.max.x - z.min.x) * pxPerMeter, (z.max.y - z.min.y) * pxPerMeter);
    g.setLineDash([]);
  }

  // 부시
  for (const b of BUSHES) {
    g.fillStyle = COLORS.bush;
    g.beginPath();
    g.arc(b.pos.x * pxPerMeter, b.pos.y * pxPerMeter, b.r * pxPerMeter, 0, Math.PI * 2);
    g.fill();
  }

  // 기지
  for (const team of [0, 1] as Team[]) {
    g.strokeStyle = team === 0 ? 'rgba(77,163,255,0.35)' : 'rgba(255,95,109,0.35)';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(BASE[team].x * pxPerMeter, BASE[team].y * pxPerMeter, 13 * pxPerMeter, 0, Math.PI * 2);
    g.stroke();
  }

  return c;
}

export interface RenderOptions {
  viewer: Team;
  camera: Camera;
  terrain: HTMLCanvasElement;
  terrainPx: number;
  /** 조준 중인 스킬 (바닥 사거리 표시) */
  aiming: { slot: string; range: number } | null;
  pointer: Vec2 | null;
}

export function renderWorld(ctx: CanvasRenderingContext2D, world: World, opt: RenderOptions): void {
  const { width, height } = ctx.canvas;
  const { camera, viewer } = opt;
  const s = camera.scale;

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(s, s);
  ctx.translate(-camera.center.x, -camera.center.y);

  // 지형
  ctx.drawImage(opt.terrain, 0, 0, MAP_SIZE, MAP_SIZE);

  // 스킬 지역(텔레그래프 포함)
  for (const z of world.zones) {
    const friendly = z.team === viewer;
    if (z.kind === 'REVEAL') continue;
    ctx.beginPath();
    ctx.arc(z.pos.x, z.pos.y, z.radius, 0, Math.PI * 2);
    if (z.fuse > 0) {
      // 예고: 채워지는 원
      ctx.fillStyle = friendly ? 'rgba(120,190,255,0.18)' : 'rgba(255,110,110,0.22)';
      ctx.fill();
      ctx.strokeStyle = friendly ? '#7cc4ff' : '#ff7a7a';
      ctx.lineWidth = 0.25;
      ctx.stroke();
    } else {
      ctx.fillStyle =
        z.kind === 'SAFE_ZONE' || z.kind === 'BREATH' ? 'rgba(130,255,190,0.14)' : friendly ? 'rgba(120,190,255,0.12)' : 'rgba(255,140,90,0.16)';
      ctx.fill();
    }
  }

  // 가온 E 벽
  for (const b of world.barriers) {
    ctx.strokeStyle = b.team === viewer ? '#7cc4ff' : '#ff7a7a';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(b.a.x, b.a.y);
    ctx.lineTo(b.b.x, b.b.y);
    ctx.stroke();
  }

  // 조준 보조
  const player = world.player;
  if (opt.aiming && player && opt.pointer) {
    ctx.strokeStyle = 'rgba(255,225,140,0.75)';
    ctx.lineWidth = 0.18;
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, opt.aiming.range, 0, Math.PI * 2);
    ctx.stroke();
    const d = Math.hypot(opt.pointer.x - player.pos.x, opt.pointer.y - player.pos.y);
    const k = d > opt.aiming.range ? opt.aiming.range / d : 1;
    ctx.beginPath();
    ctx.moveTo(player.pos.x, player.pos.y);
    ctx.lineTo(player.pos.x + (opt.pointer.x - player.pos.x) * k, player.pos.y + (opt.pointer.y - player.pos.y) * k);
    ctx.stroke();
  }

  // 유닛
  const units = world.allUnits().sort((a, b) => rankOf(a) - rankOf(b));
  for (const u of units) {
    if (!u.alive) continue;
    if (!world.canSee(viewer, u)) continue;
    drawUnit(ctx, world, u, viewer);
  }

  // 투사체
  for (const p of world.projectiles) {
    if (!world.isVisibleTo(viewer, p.pos)) continue;
    ctx.fillStyle = p.team === viewer ? '#bfe0ff' : '#ffc0b6';
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, Math.max(0.28, p.radius), 0, Math.PI * 2);
    ctx.fill();
  }

  // 안개
  drawFog(ctx, world, viewer);

  ctx.restore();
}

function rankOf(u: Unit): number {
  switch (u.kind) {
    case 'CORE':
      return 0;
    case 'TURRET':
      return 1;
    case 'CAMP':
    case 'OBJECTIVE':
      return 2;
    case 'MINION':
      return 3;
    default:
      return 4;
  }
}

function drawUnit(ctx: CanvasRenderingContext2D, world: World, u: Unit, viewer: Team): void {
  const friendly = u.team === viewer;
  const neutral = u.kind === 'CAMP' || u.kind === 'OBJECTIVE';
  const color = neutral ? COLORS.neutral : friendly ? COLORS.blue : COLORS.red;

  if (u.kind === 'TURRET' || u.kind === 'CORE') {
    // 구조물: 사각형 실루엣 (색상 외 형태로도 구분)
    const r = u.radius;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(u.pos.x - r, u.pos.y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#0a0d14';
    ctx.lineWidth = 0.18;
    ctx.strokeRect(u.pos.x - r, u.pos.y - r, r * 2, r * 2);
    if (u.kind === 'CORE' && !world.coreVulnerable(u.team)) {
      ctx.strokeStyle = 'rgba(200,220,255,0.5)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.arc(u.pos.x, u.pos.y, r + 1.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawHpBar(ctx, u, color, 3.2);
    return;
  }

  ctx.beginPath();
  ctx.arc(u.pos.x, u.pos.y, u.radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  if (u.kind === 'HERO') {
    // 영웅: 두꺼운 외곽선 + 진영별 문양(삼각/사각)으로 형태 구분
    ctx.lineWidth = 0.22;
    ctx.strokeStyle = friendly ? '#dff0ff' : '#ffe0dc';
    ctx.stroke();
    ctx.beginPath();
    const f = u.facing;
    ctx.moveTo(u.pos.x + f.x * (u.radius + 0.7), u.pos.y + f.y * (u.radius + 0.7));
    ctx.lineTo(u.pos.x - f.y * 0.35, u.pos.y + f.x * 0.35);
    ctx.lineTo(u.pos.x + f.y * 0.35, u.pos.y - f.x * 0.35);
    ctx.closePath();
    ctx.fillStyle = friendly ? '#dff0ff' : '#ffe0dc';
    ctx.fill();

    if (world.playerId === u.id) {
      ctx.strokeStyle = '#ffe08a';
      ctx.lineWidth = 0.28;
      ctx.beginPath();
      ctx.arc(u.pos.x, u.pos.y, u.radius + 0.55, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawHpBar(ctx, u, color, 1.9);
    // 군중제어 표시
    if (u.statuses.some((s) => s.kind !== 'SLOW')) {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(u.pos.x, u.pos.y - u.radius - 2.6, 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = COLORS.text;
    ctx.font = '1.15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${u.name} ${u.level}`, u.pos.x, u.pos.y + u.radius + 2.1);
    return;
  }

  if (neutral) {
    ctx.lineWidth = 0.2;
    ctx.strokeStyle = '#f0dfa8';
    ctx.stroke();
    drawHpBar(ctx, u, COLORS.neutral, u.radius + 1.4);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '1.1px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(u.name, u.pos.x, u.pos.y + u.radius + 2);
    return;
  }

  drawHpBar(ctx, u, color, 1.2);
}

function drawHpBar(ctx: CanvasRenderingContext2D, u: Unit, color: string, offset: number): void {
  const w = u.kind === 'HERO' ? 3.2 : u.kind === 'CORE' ? 6 : u.kind === 'TURRET' ? 4 : 1.8;
  const h = u.kind === 'HERO' ? 0.5 : 0.36;
  const x = u.pos.x - w / 2;
  const y = u.pos.y - offset;
  const ratio = Math.max(0, Math.min(1, u.stats.hp / u.stats.maxHp));
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * ratio, h);
  const shield = u.shields.reduce((a, b) => a + b.amount, 0);
  if (shield > 0) {
    ctx.fillStyle = '#dfe8ff';
    ctx.fillRect(x, y - h * 0.5, Math.min(w, (shield / u.stats.maxHp) * w), h * 0.42);
  }
}

let fogCanvas: HTMLCanvasElement | null = null;

function drawFog(ctx: CanvasRenderingContext2D, world: World, viewer: Team): void {
  const dim = Math.ceil(MAP_SIZE / 2);
  if (!fogCanvas) {
    fogCanvas = document.createElement('canvas');
    fogCanvas.width = dim;
    fogCanvas.height = dim;
  }
  const fg = fogCanvas.getContext('2d')!;
  const img = fg.createImageData(dim, dim);
  const grid = world.visionGrid[viewer];
  for (let i = 0; i < dim * dim; i++) {
    const visible = grid[i] === 1;
    img.data[i * 4] = 4;
    img.data[i * 4 + 1] = 6;
    img.data[i * 4 + 2] = 12;
    img.data[i * 4 + 3] = visible ? 0 : 205;
  }
  fg.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(fogCanvas, 0, 0, MAP_SIZE, MAP_SIZE);
}

/** 미니맵 */
export function renderMinimap(ctx: CanvasRenderingContext2D, world: World, terrain: HTMLCanvasElement, viewer: Team): void {
  const size = ctx.canvas.width;
  ctx.clearRect(0, 0, size, size);
  ctx.globalAlpha = 0.85;
  ctx.drawImage(terrain, 0, 0, size, size);
  ctx.globalAlpha = 1;
  const k = size / MAP_SIZE;

  for (const u of world.allUnits()) {
    if (!u.alive) continue;
    if (u.team !== viewer && !world.canSee(viewer, u)) continue;
    const neutral = u.kind === 'CAMP' || u.kind === 'OBJECTIVE';
    if (u.kind === 'MINION') continue;
    ctx.fillStyle = neutral ? COLORS.neutral : u.team === viewer ? COLORS.blue : COLORS.red;
    const r = u.kind === 'HERO' ? 3 : u.kind === 'CORE' ? 4 : 2.4;
    if (u.kind === 'TURRET' || u.kind === 'CORE') {
      ctx.fillRect(u.pos.x * k - r / 2, u.pos.y * k - r / 2, r, r);
    } else {
      ctx.beginPath();
      ctx.arc(u.pos.x * k, u.pos.y * k, r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (world.playerId === u.id) {
      ctx.strokeStyle = '#ffe08a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(u.pos.x * k, u.pos.y * k, r + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

export function screenToWorld(px: number, py: number, canvas: HTMLCanvasElement, camera: Camera): Vec2 {
  return {
    x: camera.center.x + (px - canvas.width / 2) / camera.scale,
    y: camera.center.y + (py - canvas.height / 2) / camera.scale,
  };
}

/** 조준 지점에서 가장 가까운 적 유닛 (수동 타깃 보조) */
export function pickUnitAt(world: World, p: Vec2, viewer: Team, radius = 2.2): Unit | null {
  let best: Unit | null = null;
  let bestD = radius;
  for (const u of world.allUnits()) {
    if (!u.alive || u.team === viewer) continue;
    if (!world.canSee(viewer, u)) continue;
    const d = dist(p, u.pos);
    if (d < bestD) {
      bestD = d;
      best = u;
    }
  }
  return best;
}

export { COLORS };
