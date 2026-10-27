// 기본 도형을 조합해 만드는 3D 모델들. 1 단위 = 1m (파라다이스 시설은 1칸 = 1 단위).
// 탈것은 +x가 앞, +y가 위, +z가 오른쪽이다.
import * as THREE from "three";
import type { ItemId } from "@/lib/boat/paradise";

const WHITE = 0xf7f8fa;
const BLACK = 0x14161b;
const GOLD = 0xd4a93a;
const CYAN = 0x35e6ff;

interface MatOpts {
  metal?: number;
  rough?: number;
  emissive?: number;
  opacity?: number;
  side?: THREE.Side;
}

const matCache = new Map<string, THREE.MeshStandardMaterial>();
export function std(color: number, o: MatOpts = {}) {
  const key = `${color}|${o.metal ?? 0}|${o.rough ?? 0.6}|${o.emissive ?? -1}|${o.opacity ?? 1}|${o.side ?? 0}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      metalness: o.metal ?? 0,
      roughness: o.rough ?? 0.6,
      emissive: o.emissive ?? 0x000000,
      transparent: (o.opacity ?? 1) < 1,
      opacity: o.opacity ?? 1,
      side: o.side ?? THREE.FrontSide,
    });
    matCache.set(key, m);
  }
  return m;
}

const glowCache = new Map<number, THREE.MeshBasicMaterial>();
function glow(color: number) {
  let m = glowCache.get(color);
  if (!m) glowCache.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}

const gold = () => std(GOLD, { metal: 1, rough: 0.25 });
const white = () => std(WHITE, { metal: 0.15, rough: 0.3 });
const black = () => std(BLACK, { metal: 0.6, rough: 0.25 });

function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}
const box = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) =>
  mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);
const cyl = (rt: number, rb: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 16) =>
  mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
const sph = (r: number, m: THREE.Material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
  const o = mesh(new THREE.SphereGeometry(r, 16, 12), m, x, y, z);
  o.scale.set(sx, sy, sz);
  return o;
};
// x축 방향으로 누운 캡슐 (선체·동체)
function capX(r: number, len: number, m: THREE.Material, x: number, y: number, z: number, sy = 1, sz = 1) {
  const o = mesh(new THREE.CapsuleGeometry(r, len, 6, 14).rotateZ(Math.PI / 2), m, x, y, z);
  o.scale.set(1, sy, sz);
  return o;
}
// 두 점을 잇는 캡슐 (팔다리·몸통)
function limb(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const o = mesh(new THREE.CapsuleGeometry(r, Math.max(len - 2 * r, 0.001), 4, 8), m);
  o.position.copy(a).addScaledVector(d, 0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return o;
}
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- 제트스키 + 라이더

export interface SkiStyle {
  deck: number;
  suit: number;
  helmet: number;
  visor: number;
  stripe: number;
}

export const PLAYER_STYLE: SkiStyle = { deck: WHITE, suit: WHITE, helmet: WHITE, visor: GOLD, stripe: GOLD };

export const RIVAL_STYLES: SkiStyle[] = [0xef4444, 0xf97316, 0x22c55e, 0xa855f7, 0x0ea5e9].map((c) => ({
  deck: c, suit: c, helmet: c, visor: 0x1b2430, stripe: WHITE,
}));

// 위에서 본 윤곽(뾰족한 뱃머리, 평평한 선미)을 높이 h로 밀어 올린 선체 조각
function hullSlab(len: number, wid: number, h: number, bevel: number) {
  const L = len / 2, W = wid / 2;
  const s = new THREE.Shape();
  s.moveTo(L, 0);
  s.quadraticCurveTo(L * 0.7, W * 0.98, L * 0.25, W);
  s.lineTo(-L * 0.9, W * 0.92);
  s.lineTo(-L, W * 0.6);
  s.lineTo(-L, -W * 0.6);
  s.lineTo(-L * 0.9, -W * 0.92);
  s.lineTo(L * 0.25, -W);
  s.quadraticCurveTo(L * 0.7, -W * 0.98, L, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 16 });
  return g.rotateX(-Math.PI / 2);
}

export function createJetSki(style: SkiStyle) {
  const group = new THREE.Group(); // 위치·방향·피치
  const lean = new THREE.Group(); // 코너링 롤
  group.add(lean);

  // 선체: 검정 하부 → 시안 선 → 금색 선 → 상판 순으로 쌓는다
  lean.add(mesh(hullSlab(3.7, 1.0, 0.2, 0.06), black(), 0, 0.08, 0));
  lean.add(mesh(hullSlab(3.66, 1.0, 0.015, 0.02), glow(CYAN), 0, 0.32, 0));
  lean.add(mesh(hullSlab(3.7, 1.0, 0.02, 0.025), std(style.stripe, { metal: 1, rough: 0.25 }), 0, 0.36, 0));
  lean.add(mesh(hullSlab(3.5, 0.94, 0.16, 0.08), std(style.deck, { metal: 0.2, rough: 0.25 }), 0, 0.41, 0));
  // 후미 제트 노즐과 시안 링
  lean.add(cyl(0.2, 0.2, 0.3, black(), -1.8, 0.42, 0, 16).rotateZ(Math.PI / 2));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 20), glow(CYAN));
  ring.position.set(-1.96, 0.42, 0);
  ring.rotation.y = Math.PI / 2;
  lean.add(ring);

  // 갑판 위: 윈드스크린·콘솔·핸들바·시트와 라이더
  const rider = new THREE.Group();
  rider.position.y = -0.06;
  lean.add(rider);
  const stripeMat = std(style.stripe, { metal: 1, rough: 0.25 });
  rider.add(box(0.04, 0.3, 0.5, std(0x0d1b2a, { metal: 0.9, rough: 0.1, opacity: 0.75 }), 0.78, 0.8, 0).rotateZ(-0.75));
  rider.add(box(0.5, 0.18, 0.42, black(), 0.3, 0.7, 0));
  rider.add(cyl(0.035, 0.035, 0.9, black(), 0.3, 0.88, 0, 8).rotateX(Math.PI / 2));
  for (const side of [1, -1]) rider.add(cyl(0.045, 0.045, 0.12, stripeMat, 0.3, 0.88, 0.47 * side, 8).rotateX(Math.PI / 2));
  rider.add(box(0.95, 0.1, 0.38, black(), -0.55, 0.7, 0));

  const suit = std(style.suit, { metal: 0.1, rough: 0.35 });
  const hip = v(-0.5, 0.78, 0);
  const shoulder = v(-0.02, 1.3, 0);
  rider.add(limb(hip, shoulder, 0.17, suit));
  for (const side of [1, -1]) {
    rider.add(limb(hip.clone().add(v(0, 0, 0.16 * side)), shoulder.clone().add(v(0, 0, 0.17 * side)), 0.025, stripeMat));
    rider.add(limb(v(-0.5, 0.78, 0.13 * side), v(-0.1, 0.84, 0.3 * side), 0.095, suit)); // 허벅지
    rider.add(limb(v(-0.1, 0.84, 0.3 * side), v(-0.22, 0.5, 0.36 * side), 0.075, suit)); // 정강이
    rider.add(limb(v(-0.02, 1.26, 0.2 * side), v(0.3, 0.9, 0.42 * side), 0.06, suit)); // 팔
    rider.add(sph(0.075, white(), 0.3, 0.9, 0.43 * side));
  }
  rider.add(sph(0.21, std(style.helmet, { metal: 0.2, rough: 0.2 }), 0.12, 1.5, 0, 1.1, 1, 0.95));
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 20, 12, Math.PI - 0.95, 1.9, 0.95, 0.75),
    std(style.visor, { metal: 1, rough: 0.12 }),
  );
  visor.position.set(0.12, 1.5, 0);
  visor.scale.set(1.1, 1, 0.95);
  rider.add(visor);

  return { group, lean };
}

// ---------------------------------------------------------------- 배

export function createSailYacht() {
  const g = new THREE.Group();
  g.add(capX(0.2, 0.8, white(), 0, 0.12, 0, 0.55, 1));
  g.add(box(0.95, 0.025, 0.02, gold(), 0, 0.17, 0.205));
  g.add(box(0.95, 0.025, 0.02, gold(), 0, 0.17, -0.205));
  g.add(box(0.4, 0.07, 0.22, std(0xb07a45, { rough: 0.8 }), -0.05, 0.27, 0));
  g.add(cyl(0.012, 0.012, 1.0, std(0xd8dde3, { metal: 0.8, rough: 0.3 }), 0.05, 0.75, 0, 8));
  const sail = std(0xffffff, { rough: 0.9, side: THREE.DoubleSide });
  const main = new THREE.Shape().moveTo(0, 0).lineTo(0, 0.85).lineTo(-0.5, 0).closePath();
  const jib = new THREE.Shape().moveTo(0, 0).lineTo(0, 0.7).lineTo(0.45, 0).closePath();
  const m1 = mesh(new THREE.ShapeGeometry(main), sail, 0.04, 0.3, 0);
  const m2 = mesh(new THREE.ShapeGeometry(jib), sail, 0.07, 0.3, 0);
  g.add(m1, m2);
  return g;
}

export function createSuperyacht() {
  const g = new THREE.Group();
  g.add(capX(0.22, 0.8, white(), 0, 0.13, 0, 0.55, 1));
  g.add(box(1.05, 0.03, 0.02, gold(), 0, 0.2, 0.225));
  g.add(box(1.05, 0.03, 0.02, gold(), 0, 0.2, -0.225));
  g.add(box(0.95, 0.12, 0.38, white(), -0.05, 0.3, 0));
  g.add(box(0.6, 0.12, 0.32, white(), -0.1, 0.42, 0));
  g.add(box(0.3, 0.1, 0.26, white(), -0.12, 0.53, 0));
  const glass = std(0x13212f, { metal: 0.9, rough: 0.1 });
  g.add(box(0.8, 0.035, 0.392, glass, -0.05, 0.31, 0));
  g.add(box(0.5, 0.035, 0.332, glass, -0.1, 0.43, 0));
  g.add(box(0.12, 0.05, 0.1, gold(), -0.12, 0.62, 0));
  g.add(cyl(0.008, 0.008, 0.2, std(0xd8dde3, { metal: 0.8 }), -0.12, 0.7, 0, 6));
  return g;
}

// ---------------------------------------------------------------- 파라다이스 시설 (1칸 안에 들어가는 크기)

function palm() {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([v(0, 0, 0), v(0.05, 0.25, 0), v(0.1, 0.5, 0), v(0.08, 0.78, 0)]);
  g.add(mesh(new THREE.TubeGeometry(curve, 8, 0.04, 6), std(0x8a6a45, { rough: 0.9 })));
  const leafMat = std(0x2e9b4a, { rough: 0.7, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const arm = new THREE.Group();
    arm.position.set(0.08, 0.78, 0);
    arm.rotation.y = (i / 7) * Math.PI * 2;
    const leaf = sph(0.3, leafMat, 0.25, -0.03, 0, 1, 0.06, 0.22);
    leaf.rotation.z = -0.4;
    arm.add(leaf);
    g.add(arm);
  }
  for (const [x, z] of [[0.1, 0.04], [0.04, -0.04], [0.12, -0.03]]) g.add(sph(0.035, std(0x5a3a1c), x, 0.72, z));
  return g;
}

function sunbed() {
  const g = new THREE.Group();
  const towel = std(0x2fb7c9);
  for (const z of [-0.2, 0.2]) {
    g.add(box(0.62, 0.05, 0.2, white(), 0, 0.05, z));
    g.add(box(0.3, 0.052, 0.2, towel, -0.08, 0.052, z));
    g.add(box(0.2, 0.04, 0.2, white(), 0.36, 0.1, z).rotateZ(0.5));
  }
  g.add(cyl(0.012, 0.012, 0.6, std(0xd8dde3, { metal: 0.6 }), 0, 0.3, 0, 6));
  g.add(cyl(0.01, 0.34, 0.12, std(0xff6b5e, { side: THREE.DoubleSide }), 0, 0.62, 0, 12));
  return g;
}

function bar() {
  const g = new THREE.Group();
  const wood = std(0x9a6b3f, { rough: 0.8 });
  g.add(box(0.84, 0.04, 0.84, wood, 0, 0.02, 0));
  for (const x of [-0.36, 0.36]) for (const z of [-0.36, 0.36]) g.add(cyl(0.025, 0.025, 0.5, wood, x, 0.28, z, 6));
  g.add(cyl(0.01, 0.62, 0.3, std(0xd9b867, { rough: 1, side: THREE.DoubleSide }), 0, 0.68, 0, 4).rotateY(Math.PI / 4));
  g.add(box(0.6, 0.14, 0.14, wood, 0, 0.11, -0.2));
  g.add(box(0.62, 0.02, 0.16, gold(), 0, 0.19, -0.2));
  for (const [x, c] of [[-0.2, 0x35c46a], [-0.05, 0xff6b5e], [0.1, 0x3b9ee8], [0.22, 0xf5c542]] as const) {
    g.add(cyl(0.025, 0.03, 0.1, std(c, { opacity: 0.9 }), x, 0.25, -0.2, 8));
  }
  for (const x of [-0.2, 0.05, 0.28]) g.add(cyl(0.05, 0.04, 0.16, white(), x, 0.1, 0.12, 10));
  return g;
}

function pool() {
  const g = new THREE.Group();
  g.add(box(0.92, 0.07, 0.92, white(), 0, 0.035, 0));
  g.add(box(0.74, 0.02, 0.74, std(0x2fd0e6, { emissive: 0x0a6a80, rough: 0.1, metal: 0.1 }), 0, 0.075, 0));
  g.add(box(0.96, 0.02, 0.03, gold(), 0, 0.075, 0.47));
  g.add(box(0.96, 0.02, 0.03, gold(), 0, 0.075, -0.47));
  return g;
}

function villa() {
  const g = new THREE.Group();
  const wall = std(0xfbfbfc, { rough: 0.5 });
  const glass = std(0x1e3a5a, { metal: 0.8, rough: 0.1 });
  g.add(box(0.8, 0.34, 0.62, wall, 0, 0.17, 0));
  g.add(box(0.56, 0.26, 0.46, wall, -0.06, 0.47, 0));
  g.add(box(0.86, 0.035, 0.68, gold(), 0, 0.352, 0));
  g.add(box(0.62, 0.035, 0.52, gold(), -0.06, 0.612, 0));
  g.add(box(0.5, 0.17, 0.02, glass, 0, 0.17, 0.315));
  g.add(box(0.36, 0.14, 0.02, glass, -0.06, 0.47, 0.235));
  g.add(box(0.26, 0.2, 0.34, wall, 0.3, 0.45, 0.12));
  return g;
}

function lighthouse() {
  const g = new THREE.Group();
  g.add(cyl(0.2, 0.22, 0.06, std(0x8a8f98), 0, 0.03, 0, 12));
  g.add(cyl(0.1, 0.17, 0.78, white(), 0, 0.45, 0, 20));
  for (const y of [0.3, 0.58]) g.add(cyl(0.13 - (y - 0.3) * 0.2, 0.14 - (y - 0.3) * 0.2, 0.07, gold(), 0, y, 0, 20));
  g.add(cyl(0.16, 0.14, 0.04, black(), 0, 0.86, 0, 20));
  g.add(cyl(0.085, 0.085, 0.12, std(0xfff1a8, { emissive: 0xffd45a }), 0, 0.94, 0, 16));
  g.add(cyl(0.0, 0.13, 0.14, gold(), 0, 1.07, 0, 16));
  return g;
}

function dock() {
  const g = new THREE.Group();
  const wood = std(0xb08455, { rough: 0.85 });
  const dark = std(0x6e4d2a, { rough: 0.9 });
  g.add(box(0.98, 0.05, 0.98, wood, 0, 0.15, 0));
  for (const z of [-0.33, 0, 0.33]) g.add(box(0.98, 0.052, 0.015, dark, 0, 0.152, z));
  for (const x of [-0.44, 0.44]) for (const z of [-0.44, 0.44]) g.add(cyl(0.04, 0.04, 0.45, dark, x, 0, z, 8));
  return g;
}

const MODELS: Record<ItemId, () => THREE.Group> = {
  palm, sunbed, bar, pool, villa, lighthouse, dock,
  yacht: createSailYacht,
  superyacht: createSuperyacht,
};

export function createItemModel(id: ItemId) {
  return MODELS[id]();
}

// ---------------------------------------------------------------- 레이스 소품

export function createFish(color: number, size: number) {
  const g = new THREE.Group();
  const skin = std(color, { metal: 0.5, rough: 0.3 });
  g.add(sph(0.5, skin, 0, 0, 0, 1.5, 0.5, 0.45));
  g.add(cyl(0.0, 0.32, 0.5, skin, -0.85, 0, 0, 4).rotateZ(-Math.PI / 2));
  g.add(sph(0.06, std(0x101418), 0.5, 0.1, 0.18));
  g.add(sph(0.06, std(0x101418), 0.5, 0.1, -0.18));
  g.scale.setScalar(size);
  return g;
}

export function createGate(poleColor: THREE.Material, half: number, banner: THREE.Material | null) {
  const g = new THREE.Group();
  for (const side of [1, -1]) {
    g.add(cyl(0.7, 0.9, 14, poleColor, 0, 6, half * side, 10));
    g.add(sph(1.2, poleColor, 0, 13.4, half * side));
  }
  if (banner) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(2 * half, 4), banner);
    b.rotation.y = Math.PI / 2;
    b.position.set(0, 12, 0);
    g.add(b);
  }
  return g;
}

export function createIsland(rand: () => number) {
  const g = new THREE.Group();
  g.add(cyl(30, 48, 6, std(0xf1dca0, { rough: 1 }), 0, -0.5, 0, 24));
  g.add(sph(24, std(0x3f8f4a, { rough: 0.9 }), 0, 2, 0, 1, 0.4, 1));
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const r = 6 + rand() * 22;
    const p = palm();
    p.position.set(Math.cos(a) * r, 3, Math.sin(a) * r);
    p.scale.setScalar(11 + rand() * 6);
    p.rotation.y = rand() * Math.PI * 2;
    g.add(p);
  }
  return g;
}

export function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.InstancedMesh) o.geometry.dispose();
  });
}
