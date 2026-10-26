"use client";

import { useEffect, useRef, useState } from "react";
import {
  attack, buildOrRepair, createGame, day, drink, eat, parseKey, throwHook, update,
  TILE_HP, type DebrisKind, type GameState,
} from "@/lib/boat/game";

const PX = 48; // 타일 한 칸의 픽셀 크기

const DEBRIS_COLOR: Record<DebrisKind, string> = {
  plank: "#a0703c",
  plastic: "#e5e7eb",
  coconut: "#6b4423",
  bottle: "#60a5fa",
  barrel: "#b45309",
};

interface Hud {
  day: number;
  hunger: number;
  thirst: number;
  health: number;
  inv: GameState["inv"];
  message: string;
  over: boolean;
}

function toHud(s: GameState): Hud {
  return {
    day: day(s),
    hunger: s.hunger,
    thirst: s.thirst,
    health: s.health,
    inv: { ...s.inv },
    message: s.message,
    over: s.over,
  };
}

export default function BoatGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createGame());
  const [hud, setHud] = useState<Hud>(() => toHud(createGame()));

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const keys = new Set<string>();
    const mouse = { x: 0, y: 0 };

    const toWorld = (px: number, py: number): [number, number] => {
      const s = stateRef.current;
      return [(px - canvas.width / 2) / PX + s.player.x, (py - canvas.height / 2) / PX + s.player.y];
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.add(k);
      const s = stateRef.current;
      if (k === "e") eat(s);
      if (k === "q") drink(s);
      if (k === " ") { e.preventDefault(); attack(s); }
      if (k === "r" && s.over) stateRef.current = createGame();
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    const onMouseMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const onMouseDown = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const [wx, wy] = toWorld(e.clientX - r.left, e.clientY - r.top);
      if (e.button === 0) throwHook(stateRef.current, wx, wy);
      if (e.button === 2) buildOrRepair(stateRef.current, wx, wy);
    };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    const onResize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };

    onResize();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", onResize);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("contextmenu", onContextMenu);

    let last = performance.now();
    let hudTimer = 0;
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const s = stateRef.current;
      const dx = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
      const dy = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
      update(s, dt, { dx, dy });
      draw(ctx, s, now / 1000, toWorld(mouse.x, mouse.y));
      hudTimer -= dt;
      if (hudTimer <= 0) {
        hudTimer = 0.1;
        setHud(toHud(s));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-sky-900 select-none">
      <canvas ref={canvasRef} className="h-full w-full cursor-crosshair" />

      <div className="pointer-events-none absolute left-4 top-4 w-56 space-y-2 rounded-lg bg-black/50 p-3 text-sm text-white">
        <div className="font-bold">🌊 {hud.day}일째</div>
        <Bar label="체력" value={hud.health} color="bg-red-500" />
        <Bar label="배고픔" value={hud.hunger} color="bg-amber-500" />
        <Bar label="갈증" value={hud.thirst} color="bg-sky-400" />
        <div className="grid grid-cols-2 gap-1 pt-1 text-xs">
          <span>🪵 판자 {hud.inv.plank}</span>
          <span>🧴 플라스틱 {hud.inv.plastic}</span>
          <span>🥥 식량 {hud.inv.food}</span>
          <span>💧 물 {hud.inv.water}</span>
        </div>
      </div>

      <div className="pointer-events-none absolute right-4 top-4 rounded-lg bg-black/50 p-3 text-xs leading-5 text-white">
        <div>WASD 이동</div>
        <div>좌클릭 갈고리 던지기</div>
        <div>우클릭 건설(판자2·플라스틱1) / 수리(판자1)</div>
        <div>E 먹기 · Q 마시기 · Space 상어 공격</div>
      </div>

      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded bg-black/50 px-4 py-2 text-sm text-white">
        {hud.message}
      </div>

      {hud.over && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white">
          <div className="text-3xl font-bold">게임 오버</div>
          <div>{hud.message}</div>
          <div className="text-sm opacity-80">R 키로 다시 시작</div>
        </div>
      )}
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span>{Math.ceil(value)}</span>
      </div>
      <div className="h-2 w-full rounded bg-white/20">
        <div className={`h-2 rounded ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function draw(ctx: CanvasRenderingContext2D, s: GameState, t: number, cursor: [number, number]) {
  const { width: w, height: h } = ctx.canvas;
  const sx = (x: number) => (x - s.player.x) * PX + w / 2;
  const sy = (y: number) => (y - s.player.y) * PX + h / 2;

  // 바다 + 흘러가는 물결
  ctx.fillStyle = "#0e5a8a";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  const offset = ((t * 0.6 - s.player.y) * PX) % PX;
  for (let y = -PX + offset; y < h + PX; y += PX) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, y + Math.sin(x / 40 + t) * 4);
    ctx.stroke();
  }

  // 뗏목
  for (const [k, hp] of s.raft) {
    const [x, y] = parseKey(k);
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(sx(x) + 1, sy(y) + 1, PX - 2, PX - 2);
    ctx.strokeStyle = "#5c3a1a";
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(sx(x) + 2, sy(y) + (PX / 4) * i);
      ctx.lineTo(sx(x) + PX - 2, sy(y) + (PX / 4) * i);
      ctx.stroke();
    }
    if (hp < TILE_HP) {
      ctx.fillStyle = `rgba(220,38,38,${0.25 * (TILE_HP - hp)})`;
      ctx.fillRect(sx(x) + 1, sy(y) + 1, PX - 2, PX - 2);
    }
  }

  // 커서 칸 표시
  const [cx, cy] = [Math.floor(cursor[0]), Math.floor(cursor[1])];
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(sx(cx), sy(cy), PX, PX);
  ctx.setLineDash([]);

  // 부유물
  for (const d of s.debris) drawDebris(ctx, d.kind, sx(d.x), sy(d.y));

  // 상어
  if (s.shark.mode !== "dead") {
    const x = sx(s.shark.x), y = sy(s.shark.y);
    ctx.fillStyle = s.shark.mode === "attack" ? "#475569" : "#64748b";
    ctx.beginPath();
    ctx.ellipse(x, y, PX * 0.6, PX * 0.25, s.shark.angle + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x + 8, y + 4);
    ctx.lineTo(x - 8, y + 4);
    ctx.fill();
  }

  // 갈고리 + 줄
  if (s.hook) {
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx(s.player.x), sy(s.player.y));
    ctx.lineTo(sx(s.hook.x), sy(s.hook.y));
    ctx.stroke();
    ctx.fillStyle = "#9ca3af";
    ctx.beginPath();
    ctx.arc(sx(s.hook.x), sy(s.hook.y), 5, 0, Math.PI * 2);
    ctx.fill();
    for (const d of s.hook.carried) drawDebris(ctx, d.kind, sx(d.x), sy(d.y));
  }

  // 플레이어
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, PX * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawDebris(ctx: CanvasRenderingContext2D, kind: DebrisKind, x: number, y: number) {
  ctx.fillStyle = DEBRIS_COLOR[kind];
  if (kind === "plank") ctx.fillRect(x - 14, y - 4, 28, 8);
  else if (kind === "barrel") ctx.fillRect(x - 10, y - 12, 20, 24);
  else {
    ctx.beginPath();
    ctx.arc(x, y, kind === "plastic" ? 7 : 9, 0, Math.PI * 2);
    ctx.fill();
  }
}
