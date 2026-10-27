"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { BoardProps, Tool } from "@/components/boat/ParadiseView";
import { CATALOG, GRID_H, GRID_W, placeError, reclaimError, type Save } from "@/lib/boat/paradise";
import { createItemModel, disposeObject, std } from "@/lib/boat3d/models";
import { HORIZON, SUN_DIR, createEnvironment, createSky, createWater, waveHeight } from "@/lib/boat3d/water";

const SAND_TOP = 0.15;
const idxOf = (x: number, y: number) => y * GRID_W + x;

// 모래 칸 둘레에 번지는 부드러운 거품 테두리
function foamTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.shadowColor = "white";
  g.shadowBlur = 18;
  g.fillStyle = "white";
  g.fillRect(34, 34, 60, 60);
  return new THREE.CanvasTexture(c);
}

function validFor(save: Save, tool: Tool, i: number) {
  if (tool === "sell") return save.cells[i].item !== null;
  if (tool === "reclaim") return reclaimError(save, i) === null;
  return placeError(save, i, tool) === null;
}

// 요트는 정박한 부두와 나란히 놓는다
function dockAxis(save: Save, i: number) {
  const x = i % GRID_W, y = Math.floor(i / GRID_W);
  const at = (cx: number, cy: number) => cx >= 0 && cx < GRID_W && cy >= 0 && cy < GRID_H && save.cells[idxOf(cx, cy)].item === "dock";
  return at(x - 1, y) || at(x + 1, y) ? "z" : "x";
}

interface Ctx {
  sync: (save: Save) => void;
}

export default function ParadiseBoard3D({ save, tool, onCell }: BoardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<Ctx | null>(null);
  const live = useRef({ save, tool, onCell });

  useEffect(() => {
    live.current = { save, tool, onCell };
    ctxRef.current?.sync(save);
  }, [save, tool, onCell]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(HORIZON, 0.012);
    scene.environment = createEnvironment(renderer);
    scene.environmentIntensity = 0.7;
    const camera = new THREE.PerspectiveCamera(40, 1.25, 0.1, 400);
    const target = new THREE.Vector3(GRID_W / 2, 0, GRID_H / 2 + 0.4);
    camera.position.set(GRID_W / 2, 7.5, GRID_H / 2 + 8.4);
    const controls = new OrbitControls(camera, canvas);
    controls.target.copy(target);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = 4.5;
    controls.maxDistance = 22;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = 1.3;

    const sky = createSky();
    scene.add(sky);
    const water = createWater(
      { amp: 0.05, freq: 6, ripple: 0.6, rippleFreq: 3, foam: 0, spark: 0.45, deep: 0x0d7fa6, shallow: 0x35d3d6, fogNear: 25, fogFar: 90 },
      160, 160,
    );
    water.position.set(target.x, 0, target.z);
    scene.add(water);

    scene.add(new THREE.HemisphereLight(0xdff2ff, 0x4aa6b8, 1.5));
    const sun = new THREE.DirectionalLight(0xfff0d0, 2.6);
    sun.position.copy(SUN_DIR).multiplyScalar(18).add(target);
    sun.target.position.copy(target);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 50 });
    sun.shadow.bias = -0.0005;
    scene.add(sun, sun.target);

    // 칸 하이라이트
    const hl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 0.96).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.5, depthWrite: false }),
    );
    hl.visible = false;
    hl.renderOrder = 5;
    scene.add(hl);

    const tiles = new Map<number, THREE.Group>();
    const items = new Map<number, { key: string; obj: THREE.Group }>();
    const sandGeo = new THREE.BoxGeometry(1.002, 0.3, 1.002);
    const foamGeo = new THREE.PlaneGeometry(1.5, 1.5).rotateX(-Math.PI / 2);
    const foamMat = new THREE.MeshBasicMaterial({ map: foamTexture(), transparent: true, opacity: 0.55, depthWrite: false });

    const sync = (s: Save) => {
      s.cells.forEach((c, i) => {
        const x = i % GRID_W, y = Math.floor(i / GRID_W);
        const hasTile = tiles.has(i);
        if (c.terrain === "sand" && !hasTile) {
          const g = new THREE.Group();
          const shade = 0xffe7ac - (((i * 37) % 7) * 0x010302);
          const sand = new THREE.Mesh(sandGeo, std(shade, { rough: 1 }));
          sand.position.y = SAND_TOP - 0.15;
          sand.receiveShadow = true;
          sand.castShadow = true;
          const foam = new THREE.Mesh(foamGeo, foamMat);
          foam.position.y = 0.045;
          foam.renderOrder = 1;
          g.add(foam, sand);
          g.position.set(x + 0.5, 0, y + 0.5);
          scene.add(g);
          tiles.set(i, g);
        } else if (c.terrain !== "sand" && hasTile) {
          scene.remove(tiles.get(i)!);
          tiles.delete(i);
        }

        const key = c.item ? `${c.item}|${c.item === "yacht" || c.item === "superyacht" ? dockAxis(s, i) : ""}` : "";
        const cur = items.get(i);
        if (cur && cur.key !== key) {
          scene.remove(cur.obj);
          disposeObject(cur.obj);
          items.delete(i);
        }
        if (c.item && !items.get(i)) {
          const obj = createItemModel(c.item);
          if (key.endsWith("|z")) obj.rotation.y = Math.PI / 2;
          obj.position.set(x + 0.5, CATALOG[c.item].on === "sand" ? SAND_TOP : 0, y + 0.5);
          obj.userData.bob = CATALOG[c.item].needsDock ? i : null;
          obj.userData.baseY = obj.position.y;
          scene.add(obj);
          items.set(i, { key, obj });
        }
      });
    };
    ctxRef.current = { sync };
    sync(live.current.save);

    // 피킹: 바다 평면과의 교점으로 칸을 구한다
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    let hover = -1;
    const pick = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      if (!ray.ray.intersectPlane(plane, hit)) return -1;
      const x = Math.floor(hit.x), y = Math.floor(hit.z);
      return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H ? idxOf(x, y) : -1;
    };
    let down: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => { hover = pick(e); };
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
      hover = pick(e);
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      const i = pick(e);
      if (moved < 6 && i >= 0) live.current.onCell(i);
    };
    const onLeave = () => { hover = -1; };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);

    const onResize = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(wrap);
    onResize();

    let raf = 0;
    const loop = (now: number) => {
      const t = now / 1000;
      controls.update();
      (water.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      (sky.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      sky.position.copy(camera.position);
      for (const { obj } of items.values()) {
        if (obj.userData.bob === null) continue;
        obj.position.y = obj.userData.baseY + waveHeight(obj.position.x, obj.position.z, t, 6, 0.05) + Math.sin(t * 1.4 + obj.userData.bob) * 0.012;
        obj.rotation.z = Math.sin(t * 1.1 + obj.userData.bob) * 0.025;
      }
      const { save: s, tool: tl } = live.current;
      if (hover >= 0) {
        hl.visible = true;
        const x = hover % GRID_W, y = Math.floor(hover / GRID_W);
        hl.position.set(x + 0.5, s.cells[hover].terrain === "sand" ? SAND_TOP + 0.02 : 0.08, y + 0.5);
        (hl.material as THREE.MeshBasicMaterial).color.setHex(validFor(s, tl, hover) ? 0x4ade80 : 0xf87171);
      } else {
        hl.visible = false;
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      ctxRef.current = null;
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      scene.environment?.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative aspect-[5/4] w-full overflow-hidden rounded-xl bg-sky-900/60">
      <canvas ref={canvasRef} className="h-full w-full touch-none" />
      <div className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-white/80">
        드래그로 회전 · 휠/핀치로 확대 · 칸을 눌러 건설
      </div>
    </div>
  );
}
