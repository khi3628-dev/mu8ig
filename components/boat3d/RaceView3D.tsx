"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { RaceScreenProps } from "@/components/boat/BoatApp";
import CatchBanner from "@/components/boat/CatchBanner";
import SplitBadge from "@/components/boat/SplitBadge";
import { formatTime, ghostPose } from "@/lib/boat/ghost";
import { FISH, LAPS, TIME_LIMIT, TRACK_HALF, createRace, fishCoins, fishValue, legendCatchActive, raceResult, splitNow, standings, updateRace, type RaceState } from "@/lib/boat/race";
import {
  PLAYER_STYLE, RIVAL_STYLES, createFish, createGate, createIsland, createJetSki, createSuperyacht,
  disposeObject,
} from "@/lib/boat3d/models";
import { chop, createHop, stepHop } from "@/lib/boat3d/bounce";
import { sfxEvents, sfxSnapshot } from "@/lib/boat3d/sfx";
import { RaceAudio, readMuted, writeMuted } from "./raceAudio";
import { boundaryPoints } from "@/lib/boat3d/track";
import { HORIZON, SUN_DIR, createEnvironment, createSky, createWater, waveHeight } from "@/lib/boat3d/water";

const FISH_COLORS = [0xc7ced6, 0x3fa3a0, 0x1e4a8a, 0xffd34a];
const FISH_SIZE = [1.1, 1.4, 2.2, 2.8];
const NEXT_GATE = 0xffd23a;
const GATE = 0xf97316;

interface Hud {
  time: number;
  lap: number;
  rank: number;
  speed: number;
  fishCoins: number;
  canFish: boolean;
  legend: number; // 기념 컷에 띄울 금액 (0이면 숨김)
  best: number | null; // 베스트 기록 (고스트가 있을 때)
  split: number | null; // 방금 지난 게이트에서 베스트와의 차이
  gear: "D" | "R";
  boost: boolean;
  message: string;
}

function toHud(s: RaceState, canFish: boolean, reverse = false): Hud {
  const p = s.racers[0];
  return {
    time: s.time,
    lap: Math.min(p.lap + 1, LAPS),
    rank: standings(s).indexOf(p) + 1,
    speed: p.speed,
    fishCoins: fishCoins(s),
    canFish,
    legend: legendCatchActive(s) ? fishValue(s, FISH.length - 1) : 0,
    best: s.ghost?.time ?? null,
    split: splitNow(s),
    gear: reverse ? "R" : "D",
    boost: p.boost > 0,
    message: s.messageTimer > 0 ? s.message : "",
  };
}

type TouchKey = "gas" | "brake" | "left" | "right";

const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

function softCircle() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function checkerTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d")!;
  for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) {
    g.fillStyle = (x + y) % 2 ? "#ffffff" : "#111111";
    g.fillRect(x * 16, y * 16, 16, 16);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function chevronTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(10,40,70,0.55)";
  g.beginPath();
  g.arc(64, 64, 62, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#5eead4";
  g.lineWidth = 12;
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const dx of [-22, 14]) {
    g.beginPath();
    g.moveTo(52 + dx, 36);
    g.lineTo(82 + dx, 64);
    g.lineTo(52 + dx, 92);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function nameTag(name: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.font = "bold 36px sans-serif";
  g.textAlign = "center";
  g.fillStyle = "rgba(0,0,0,0.45)";
  g.fillRect(48, 8, 160, 48);
  g.fillStyle = "#fff";
  g.fillText(name, 128, 46);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true, sizeAttenuation: false }),
  );
  sprite.scale.set(0.17, 0.0425, 1); // 거리와 상관없이 화면에서 일정한 크기
  sprite.renderOrder = 10;
  return sprite;
}

function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function RaceView3D({ stats, perks, ghost, onFinish }: RaceScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const touchRef = useRef({ gas: false, brake: false, left: false, right: false, fish: false, gear: false });
  const [hud, setHud] = useState<Hud>(() => toHud(createRace(), false));
  const [muted, setMuted] = useState(readMuted);
  const audioRef = useRef<RaceAudio | null>(null);
  const toggleMute = () =>
    setMuted((m) => {
      audioRef.current?.setMuted(!m);
      writeMuted(!m);
      return !m;
    });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const mini = miniRef.current!.getContext("2d")!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(HORIZON, 0.0008);
    scene.environment = createEnvironment(renderer);
    scene.environmentIntensity = 0.7;
    const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 4000);

    const sky = createSky();
    scene.add(sky);
    const water = createWater(
      { amp: 0.35, freq: 1, ripple: 1, rippleFreq: 1, foam: 0.28, spark: 1, deep: 0x0a4f7d, shallow: 0x1fb5c9, fogNear: 300, fogFar: 1300 },
      2200, 240,
    );
    scene.add(water);
    scene.add(new THREE.HemisphereLight(0xcfe9ff, 0x2a6a8a, 1.4));
    const sun = new THREE.DirectionalLight(0xfff1d6, 2.4);
    sun.position.copy(SUN_DIR).multiplyScalar(300);
    scene.add(sun);

    const state = createRace(Math.random, stats, perks, ghost);
    const rand = mulberry(7);
    const waveAt = (x: number, z: number, t: number) => waveHeight(x, z, t, 1, 0.35);

    // 코스: 경계 부표, 체크포인트 게이트, 부스트 패드
    const edgePts = boundaryPoints(state.course, TRACK_HALF);
    const edgeBuoys = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.9, 10, 8),
      new THREE.MeshStandardMaterial({ roughness: 0.4 }),
      edgePts.length,
    );
    edgePts.forEach((_, i) => edgeBuoys.setColorAt(i, new THREE.Color(i % 2 ? 0xffffff : 0xe23b3b)));
    scene.add(edgeBuoys);

    const n = state.course.length;
    const checker = new THREE.MeshBasicMaterial({ map: checkerTexture(), side: THREE.DoubleSide });
    const ribbon = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const gatePoleMats = state.course.map(() => new THREE.MeshStandardMaterial({ color: GATE, roughness: 0.4 }));
    state.course.forEach((c, i) => {
      const prev = state.course[(i - 1 + n) % n];
      const next = state.course[(i + 1) % n];
      const gate = createGate(gatePoleMats[i], TRACK_HALF, i === 0 ? checker : ribbon);
      gate.position.set(c.x, 0, c.y);
      gate.rotation.y = -Math.atan2(next.y - prev.y, next.x - prev.x);
      scene.add(gate);
    });
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 120, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: NEXT_GATE, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }),
    );
    scene.add(beam);

    const padTex = chevronTexture();
    const pads = state.boostPads.map((p) => {
      const m = new THREE.Mesh(
        new THREE.CircleGeometry(5.5, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: padTex, transparent: true, depthWrite: false }),
      );
      m.position.set(p.x, 0.3, p.y);
      m.renderOrder = 2;
      scene.add(m);
      return m;
    });

    // 풍경: 먼 섬과 슈퍼요트
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + rand() * 0.4;
      const isl = createIsland(rand);
      isl.position.set(Math.cos(a) * (380 + rand() * 120), 0, Math.sin(a) * (300 + rand() * 100));
      isl.scale.setScalar(0.9 + rand() * 0.9);
      scene.add(isl);
    }
    for (let k = 0; k < 4; k++) {
      const y = createSuperyacht();
      const a = rand() * Math.PI * 2;
      y.position.set(Math.cos(a) * 330, 0, Math.sin(a) * 250);
      y.rotation.y = rand() * Math.PI * 2;
      y.scale.setScalar(55);
      scene.add(y);
    }

    // 레이서
    const skis = state.racers.map((r, i) => {
      const s = createJetSki(i === 0 ? PLAYER_STYLE : RIVAL_STYLES[i - 1]);
      s.group.scale.setScalar(1.5);
      let tag: THREE.Sprite | null = null;
      if (i > 0) {
        tag = nameTag(r.name);
        tag.position.set(0, 2.9, 0);
        s.group.add(tag);
      }
      scene.add(s.group);
      return { ...s, tag, hop: createHop(), roll: 0, prevHeading: r.heading, acc: 0 };
    });

    // 베스트 기록 고스트: 같은 제트스키를 반투명 하늘색으로
    let ghostSki: THREE.Group | null = null;
    if (state.ghost) {
      ghostSki = createJetSki(PLAYER_STYLE).group;
      const ghostMat = new THREE.MeshBasicMaterial({ color: 0x9be7ff, transparent: true, opacity: 0.35, depthWrite: false });
      ghostSki.traverse((o) => {
        if (o instanceof THREE.Mesh) o.material = ghostMat;
      });
      ghostSki.scale.setScalar(1.5);
      const tag = nameTag("베스트");
      tag.position.set(0, 2.9, 0);
      ghostSki.add(tag);
      scene.add(ghostSki);
    }

    // 물보라 (링 버퍼 파티클)
    const N = 1400;
    const pPos = new Float32Array(N * 3).fill(-9999);
    const pCol = new Float32Array(N * 3);
    const pVel = new Float32Array(N * 3);
    const pLife = new Float32Array(N);
    const pMax = new Float32Array(N).fill(1);
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
    const sprayTex = softCircle();
    const spray = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ size: 0.8, map: sprayTex, vertexColors: true, transparent: true, depthWrite: false }),
    );
    spray.frustumCulled = false;
    scene.add(spray);
    let pHead = 0;
    const emit = (x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number) => {
      const i = pHead;
      pHead = (pHead + 1) % N;
      pPos.set([x, y, z], i * 3);
      pVel.set([vx, vy, vz], i * 3);
      pLife[i] = pMax[i] = life;
    };

    // 낚시용 물고기
    const fishObjs = new Map<number, THREE.Group>();
    const fishRing = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.7, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }),
    );
    const ringPool: THREE.Mesh[] = [];

    // 입력
    const keys = new Set<string>();
    let fishPressed = false;
    let reverse = false; // 기어 R
    let audio: RaceAudio | null = null;
    try {
      audio = new RaceAudio(readMuted());
    } catch {
      // Web Audio를 쓸 수 없는 환경이면 소리 없이 진행
    }
    audioRef.current = audio;
    let sfxPrev = { ...sfxSnapshot(state), count: 0 }; // 첫 프레임에 "3" 삐 소리가 나게
    let throttleOn = false;
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((k === " " || k === "f") && !e.repeat) fishPressed = true;
      audio?.resume();
      if (k === "q" && !e.repeat) {
        reverse = !reverse;
        audio?.play({ type: "gear" });
      }
      if (k === "m" && !e.repeat) toggleMute();
      if (k === " " || k.startsWith("arrow")) e.preventDefault();
      keys.add(k);
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    const onResize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    onResize();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", onResize);

    const dummy = new THREE.Object3D();
    const p0 = state.racers[0];
    let camHeading = p0.heading;
    let lastNext = -1;
    let last = performance.now();
    let hudTimer = 0;
    let raf = 0;
    let finished = false;

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const t = now / 1000;
      const on = (...ks: string[]) => ks.some((k) => keys.has(k));
      const touch = touchRef.current;
      if (touch.gear) {
        reverse = !reverse;
        touch.gear = false;
        audio?.play({ type: "gear" });
      }
      const throttle = (on("w", "arrowup") || touch.gas ? 1 : 0) - (on("s", "arrowdown") || touch.brake ? 1 : 0);
      throttleOn = throttle > 0;
      updateRace(state, dt, {
        throttle,
        steer: (on("d", "arrowright") || touch.right ? 1 : 0) - (on("a", "arrowleft") || touch.left ? 1 : 0),
        fish: fishPressed || touch.fish,
        reverse,
      });
      fishPressed = false;
      touch.fish = false;

      (water.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      (sky.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      water.position.set(Math.round(p0.x / 10) * 10, 0, Math.round(p0.y / 10) * 10);
      sky.position.copy(camera.position);

      // 부표·패드는 파도를 따라 출렁인다
      edgePts.forEach((p, i) => {
        dummy.position.set(p.x, waveAt(p.x, p.y, t) + 0.1, p.y);
        dummy.updateMatrix();
        edgeBuoys.setMatrixAt(i, dummy.matrix);
      });
      edgeBuoys.instanceMatrix.needsUpdate = true;
      pads.forEach((m, i) => {
        const p = state.boostPads[i];
        m.position.y = waveAt(p.x, p.y, t) + 0.3;
      });

      if (p0.next !== lastNext) {
        if (lastNext >= 0) gatePoleMats[lastNext].color.setHex(GATE);
        lastNext = p0.next;
        gatePoleMats[lastNext].color.setHex(NEXT_GATE);
        const c = state.course[lastNext];
        beam.position.set(c.x, 55, c.y);
      }

      // 레이서
      state.racers.forEach((r, i) => {
        const ski = skis[i];
        const dirX = Math.cos(r.heading), dirZ = Math.sin(r.heading);
        const ahead = waveAt(r.x + dirX * 1.6, r.y + dirZ * 1.6, t);
        const behind = waveAt(r.x - dirX * 1.6, r.y - dirZ * 1.6, t);
        const speedFrac = Math.min(Math.abs(r.speed) / 30, 1.3);
        // 통통 튀기: 빠르게 파도를 넘으면 떠올랐다가 착수한다
        const impact = stepHop(ski.hop, waveAt(r.x, r.y, t) + chop(r.x, r.y, t) + 0.15, dt, r.speed / 30);
        ski.group.position.set(r.x, ski.hop.y, r.y);
        if (ski.tag) ski.tag.visible = camera.position.distanceTo(ski.group.position) > 10;
        const nose = Math.atan2(ahead - behind, 3.2) + 0.07 * speedFrac + (ski.hop.airborne ? 0.1 : 0);
        ski.group.rotation.set(0, -r.heading, nose);
        if (i === 0 && impact > 0.8) audio?.splash(impact);
        if (impact > 2) {
          // 착수 물보라
          for (let k = 0; k < 14; k++) {
            const a = Math.random() * Math.PI * 2;
            emit(
              r.x + Math.cos(a) * 1.2, 0.3, r.y + Math.sin(a) * 1.2,
              Math.cos(a) * (2 + Math.random() * 2), 2 + impact * Math.random(), Math.sin(a) * (2 + Math.random() * 2),
              0.5 + Math.random() * 0.4,
            );
          }
        }
        const yawRate = dt > 0 ? angleDiff(r.heading, ski.prevHeading) / dt : 0;
        ski.prevHeading = r.heading;
        const targetRoll = THREE.MathUtils.clamp(yawRate * 0.25, -0.55, 0.55) * Math.min(speedFrac, 1);
        ski.roll += (targetRoll - ski.roll) * (1 - Math.exp(-6 * dt));
        ski.lean.rotation.x = ski.roll;

        if (r.speed > 4 && !ski.hop.airborne) {
          ski.acc += r.speed * (r.isPlayer ? 2.4 : 1.6) * dt * (r.boost > 0 ? 1.8 : 1);
          while (ski.acc >= 1) {
            ski.acc -= 1;
            const side = (Math.random() - 0.5) * 2.2;
            emit(
              r.x - dirX * 2.6 - dirZ * side * 0.3, 0.3, r.y - dirZ * 2.6 + dirX * side * 0.3,
              -dirX * r.speed * 0.05 - dirZ * side * 2.2, 2 + Math.random() * 3.5, -dirZ * r.speed * 0.05 + dirX * side * 2.2,
              0.6 + Math.random() * 0.5,
            );
          }
        }
      });

      // 소리: 엔진·물살은 매 프레임, 효과음은 상태가 바뀔 때
      if (audio) {
        // 가장 가까운 라이벌: 거리와 서로 다가오는 속도(도플러용)
        let near: (typeof state.racers)[number] | null = null;
        let nearD = Infinity;
        for (const r of state.racers) {
          const d = Math.hypot(r.x - p0.x, r.y - p0.y);
          if (!r.isPlayer && d < nearD) [near, nearD] = [r, d];
        }
        let rival = null;
        if (near && nearD > 0.1) {
          const ux = (p0.x - near.x) / nearD, uy = (p0.y - near.y) / nearD;
          const closing =
            (Math.cos(near.heading) * near.speed - Math.cos(p0.heading) * p0.speed) * ux +
            (Math.sin(near.heading) * near.speed - Math.sin(p0.heading) * p0.speed) * uy;
          rival = { dist: nearD, closing, speedFrac: near.speed / 30 };
        }
        audio.update({
          speedFrac: Math.min(Math.abs(p0.speed) / 30, 1.3),
          throttle: throttleOn && state.time >= 0,
          airborne: skis[0].hop.airborne,
          boosting: p0.boost > 0,
          rival,
        });
        const snap = sfxSnapshot(state);
        for (const ev of sfxEvents(sfxPrev, snap)) audio.play(ev);
        sfxPrev = snap;
      }

      // 물보라 갱신
      for (let i = 0; i < N; i++) {
        if (pLife[i] <= 0) continue;
        pLife[i] -= dt;
        const k = i * 3;
        pVel[k + 1] -= 9.8 * dt;
        pPos[k] += pVel[k] * dt;
        pPos[k + 1] += pVel[k + 1] * dt;
        pPos[k + 2] += pVel[k + 2] * dt;
        if (pLife[i] <= 0 || pPos[k + 1] < 0) {
          pLife[i] = 0;
          pPos[k + 1] = -9999;
        } else {
          // 흰 거품이 시간이 지나며 바다색으로 녹아든다
          const f = pLife[i] / pMax[i];
          pCol[k] = 0.1 + 0.9 * f;
          pCol[k + 1] = 0.45 + 0.55 * f;
          pCol[k + 2] = 0.55 + 0.45 * f;
        }
      }
      pGeo.attributes.position.needsUpdate = true;
      pGeo.attributes.color.needsUpdate = true;

      // 물고기
      let canFish = false;
      const alive = new Set<number>();
      for (const f of state.fish) {
        alive.add(f.id);
        let o = fishObjs.get(f.id);
        if (!o) {
          o = createFish(FISH_COLORS[f.species], FISH_SIZE[f.species]);
          fishObjs.set(f.id, o);
          scene.add(o);
        }
        const phase = 1 - f.life / f.maxLife;
        const lift = Math.sin(phase * Math.PI) * 5;
        o.position.set(f.x, lift + 0.2, f.y);
        o.rotation.set(0, -(f.id * 1.7), Math.cos(phase * Math.PI) * 0.9);
        if (Math.hypot(f.x - p0.x, f.y - p0.y) <= state.stats.catchRadius) canFish = true;
      }
      for (const [id, o] of fishObjs) {
        if (!alive.has(id)) {
          scene.remove(o);
          disposeObject(o);
          fishObjs.delete(id);
        }
      }
      // 물고기가 뛰어오른 자리에 물결 링
      while (ringPool.length < state.fish.length) {
        const r = fishRing.clone();
        r.material = (fishRing.material as THREE.MeshBasicMaterial).clone();
        ringPool.push(r);
        scene.add(r);
      }
      ringPool.forEach((r, i) => {
        const f = state.fish[i];
        r.visible = !!f;
        if (!f) return;
        const near = Math.hypot(f.x - p0.x, f.y - p0.y) <= state.stats.catchRadius;
        r.position.set(f.x, 0.25, f.y);
        r.scale.setScalar(1 + (1 - f.life / f.maxLife) * 2);
        (r.material as THREE.MeshBasicMaterial).color.setHex(near ? 0xffd23a : 0xffffff);
      });

      if (ghostSki && state.ghost) {
        const g = ghostPose(state.ghost, Math.max(0, state.time));
        ghostSki.position.set(g.x, waveAt(g.x, g.y, t) + 0.15, g.y);
        ghostSki.rotation.y = -g.heading;
      }

      // 추적 카메라
      camHeading += angleDiff(p0.heading, camHeading) * (1 - Math.exp(-4 * dt));
      const cx = Math.cos(camHeading), cz = Math.sin(camHeading);
      const intro = Math.max(0, -state.time) / 3;
      camera.position.set(p0.x - cx * (13 + intro * 14), 5.6 + intro * 9, p0.y - cz * (13 + intro * 14));
      camera.lookAt(p0.x + cx * 9, 1.8, p0.y + cz * 9);
      const fov = 62 + Math.min(Math.abs(p0.speed) / 30, 1.3) * 9 + (p0.boost > 0 ? 6 : 0);
      camera.fov += (fov - camera.fov) * (1 - Math.exp(-5 * dt));
      camera.updateProjectionMatrix();

      renderer.render(scene, camera);
      drawMinimap(mini, state);

      hudTimer -= dt;
      if (hudTimer <= 0) {
        hudTimer = 0.1;
        setHud(toHud(state, canFish, reverse));
      }
      if (state.done && !finished) {
        finished = true;
        setTimeout(() => onFinish(raceResult(state)), 1200);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      audio?.close();
      audioRef.current = null;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Sprite) {
          if ("geometry" in o) o.geometry.dispose();
          const m = o.material as THREE.Material & { map?: THREE.Texture | null };
          m.map?.dispose();
          if (m instanceof THREE.ShaderMaterial || m instanceof THREE.PointsMaterial || m instanceof THREE.MeshBasicMaterial || m instanceof THREE.SpriteMaterial) m.dispose();
        }
      });
      scene.environment?.dispose();
      renderer.dispose();
    };
  }, [onFinish, stats, perks, ghost]);

  const hold = (k: TouchKey) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      touchRef.current[k] = true;
    },
    onPointerUp: () => { touchRef.current[k] = false; },
    onPointerCancel: () => { touchRef.current[k] = false; },
  });

  const remaining = Math.max(0, TIME_LIMIT - Math.max(0, hud.time));
  const mm = Math.floor(remaining / 60);
  const ss = Math.floor(remaining % 60).toString().padStart(2, "0");
  const kmh = Math.round(Math.abs(hud.speed) * 3.6);

  return (
    <div className="relative h-full w-full select-none text-white">
      <canvas ref={canvasRef} className="h-full w-full" />
      <canvas ref={miniRef} width={160} height={104} className="pointer-events-none absolute right-4 top-4 rounded-md bg-black/55" />
      <button
        onClick={toggleMute}
        aria-label={muted ? "소리 켜기" : "소리 끄기"}
        className="absolute right-4 top-32 -skew-x-12 bg-black/55 px-3 py-1 text-[11px] font-bold tracking-[0.2em] hover:bg-black/70"
      >
        <span className="inline-block skew-x-12">{muted ? "SOUND OFF" : "SOUND ON"}</span>
      </button>

      {/* 순위·랩·기록 */}
      <div className="pointer-events-none absolute left-4 top-4">
        <Slant className="bg-black/65 px-4 py-1.5">
          <div className="flex items-end gap-1 font-black italic leading-none">
            <span className="text-5xl tabular-nums">P{hud.rank}</span>
            <span className="pb-1 text-lg text-white/55">/6</span>
          </div>
        </Slant>
        <Slant className="mt-1.5 bg-black/50 px-4 py-1.5">
          <div className="grid grid-cols-[auto_auto] gap-x-4 text-sm font-semibold tabular-nums">
            <Stat label="LAP" value={`${hud.lap}/${LAPS}`} />
            <Stat label="TIME" value={formatTime(Math.max(0, hud.time))} />
            {hud.best !== null && <Stat label="BEST" value={formatTime(hud.best)} tone="text-sky-300" />}
            <Stat label="FISH" value={`+${hud.fishCoins}`} tone="text-amber-300" />
          </div>
        </Slant>
      </div>

      {/* 남은 시간 */}
      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2">
        <Slant className="bg-black/55 px-5 py-1 text-center">
          <div className="text-[10px] font-bold tracking-[0.3em] text-white/55">TIME LEFT</div>
          <div className={`text-2xl font-black italic tabular-nums ${remaining < 30 ? "text-red-400" : ""}`}>{mm}:{ss}</div>
        </Slant>
      </div>

      {/* 속도계 */}
      <div className="pointer-events-none absolute bottom-5 right-5 pointer-coarse:bottom-48">
        <Speedo kmh={kmh} gear={hud.gear} boost={hud.boost} />
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 bg-black/50 px-3 py-1.5 text-[11px] leading-5 tracking-wide text-white/85 pointer-coarse:hidden">
        <Key>W</Key> 가속 <Key>S</Key> 감속 <Key>A</Key><Key>D</Key> 조향 <Key>Q</Key> 기어 <Key>SPACE</Key> 낚시 <Key>M</Key> 소리
      </div>

      {hud.canFish && hud.time >= 0 && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 -translate-x-1/2 pointer-coarse:bottom-48">
          <Slant className="bg-amber-400 px-5 py-1.5 text-black">
            <span className="text-lg font-black italic tracking-wide">SPACE · 낚아채기</span>
          </Slant>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 hidden touch-none justify-between p-4 pointer-coarse:flex">
        <div className="flex gap-3">
          <TouchButton label="◀" {...hold("left")} />
          <TouchButton label="▶" {...hold("right")} />
        </div>
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-3">
            <TouchButton label="D/R" onPointerDown={() => { touchRef.current.gear = true; }} />
            <TouchButton label="CATCH" onPointerDown={() => { touchRef.current.fish = true; }} />
          </div>
          <div className="flex flex-col gap-3">
            <TouchButton label="▲" {...hold("gas")} />
            <TouchButton label="▼" {...hold("brake")} />
          </div>
        </div>
      </div>

      {/* 출발 신호등: 1초마다 빨간 불이 하나씩, 출발하면 모두 초록 */}
      {hud.time < 1 && (
        <div className="pointer-events-none absolute left-1/2 top-[26%] flex -translate-x-1/2 gap-3 rounded-lg border border-white/10 bg-black/75 px-5 py-3 shadow-2xl">
          {[0, 1, 2].map((i) => {
            const lit = hud.time >= 0 ? "go" : i < 4 - Math.ceil(-hud.time) ? "on" : "off";
            return (
              <div
                key={i}
                className={`h-10 w-10 rounded-full ${
                  lit === "go"
                    ? "bg-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.9)]"
                    : lit === "on"
                      ? "bg-red-500 shadow-[0_0_24px_rgba(239,68,68,0.9)]"
                      : "bg-neutral-700"
                }`}
              />
            );
          })}
        </div>
      )}
      <SplitBadge delta={hud.split} />
      <CatchBanner value={hud.legend} />
      {hud.message && (
        <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2">
          <Slant className="bg-black/70 px-6 py-1.5">
            <span className="text-lg font-black italic tracking-wide">{hud.message}</span>
          </Slant>
        </div>
      )}
    </div>
  );
}

// 레이싱 HUD의 기울어진 패널 (내용은 다시 바로 세운다)
function Slant({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <div className={`-skew-x-12 ${className}`}>
      <div className="skew-x-12">{children}</div>
    </div>
  );
}

function Stat({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <>
      <span className="text-[11px] font-bold tracking-[0.2em] text-white/55">{label}</span>
      <span className={`text-right italic ${tone}`}>{value}</span>
    </>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return <span className="mx-0.5 rounded-sm border border-white/30 px-1 font-bold">{children}</span>;
}

// 원형 속도계: 270° 눈금이 속도만큼 채워지고, 부스트 중엔 시안색
function Speedo({ kmh, gear, boost }: { kmh: number; gear: "D" | "R"; boost: boolean }) {
  const R = 54;
  const C = 2 * Math.PI * R;
  const arc = C * 0.75;
  const frac = Math.min(kmh / 160, 1);
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 140 140" className="h-full w-full">
        <circle cx="70" cy="70" r="66" fill="rgba(0,0,0,0.6)" />
        <g transform="rotate(135 70 70)">
          <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="9" strokeDasharray={`${arc} ${C}`} />
          <circle
            cx="70" cy="70" r={R} fill="none" strokeWidth="9"
            stroke={boost ? "#22d3ee" : gear === "R" ? "#fb923c" : "#ffffff"}
            strokeDasharray={`${arc * frac} ${C}`}
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-black italic leading-none tabular-nums">{kmh}</div>
        <div className="mt-0.5 text-[10px] font-bold tracking-[0.3em] text-white/55">KM/H</div>
        <div className="mt-1 flex gap-1 text-xs font-black" aria-label={`기어 ${gear}`}>
          <span className={gear === "D" ? "text-white" : "text-white/30"}>D</span>
          <span className={gear === "R" ? "text-orange-400" : "text-white/30"}>R</span>
        </div>
      </div>
    </div>
  );
}

function TouchButton({
  label,
  ...handlers
}: { label: string } & Pick<React.HTMLAttributes<HTMLButtonElement>, "onPointerDown" | "onPointerUp" | "onPointerCancel">) {
  return (
    <button
      {...handlers}
      onContextMenu={(e) => e.preventDefault()}
      className="h-16 w-16 rounded-full border border-white/30 bg-black/40 text-sm font-black text-white backdrop-blur active:bg-white/30"
    >
      {label}
    </button>
  );
}

function drawMinimap(ctx: CanvasRenderingContext2D, s: RaceState) {
  const { width: w, height: h } = ctx.canvas;
  ctx.clearRect(0, 0, w, h);
  const scale = (w - 20) / 440;
  const mx = (x: number) => w / 2 + x * scale;
  const my = (y: number) => h / 2 + y * scale;
  ctx.strokeStyle = "rgba(125,211,252,0.8)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  s.course.forEach((c, i) => (i ? ctx.lineTo(mx(c.x), my(c.y)) : ctx.moveTo(mx(c.x), my(c.y))));
  ctx.closePath();
  ctx.stroke();
  for (const r of [...s.racers].reverse()) {
    ctx.fillStyle = r.color;
    ctx.beginPath();
    ctx.arc(mx(r.x), my(r.y), r.isPlayer ? 4.5 : 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
