"use client";

import { useEffect, useRef, useState } from "react";
import {
  FISH, LAPS, TIME_LIMIT, TRACK_HALF, createRace, fishCoins, fishValue, legendCatchActive, raceResult, standings, updateRace,
  splitNow,
  type PlayerStats, type RacePerks, type RaceResult, type RaceState, type Racer,
} from "@/lib/boat/race";
import { formatTime, ghostPose, type GhostRun } from "@/lib/boat/ghost";
import CatchBanner from "./CatchBanner";
import SplitBadge from "./SplitBadge";

const PX = 3; // 1미터당 픽셀

interface Hud {
  time: number;
  lap: number;
  rank: number;
  speed: number;
  fishCoins: number;
  legend: number; // 기념 컷에 띄울 금액 (0이면 숨김)
  best: number | null; // 베스트 기록 (고스트가 있을 때)
  split: number | null; // 방금 지난 게이트에서 베스트와의 차이
  message: string;
}

function toHud(s: RaceState): Hud {
  const p = s.racers[0];
  return {
    time: s.time,
    lap: Math.min(p.lap + 1, LAPS),
    rank: standings(s).indexOf(p) + 1,
    speed: p.speed,
    fishCoins: fishCoins(s),
    legend: legendCatchActive(s) ? fishValue(s, FISH.length - 1) : 0,
    best: s.ghost?.time ?? null,
    split: splitNow(s),
    message: s.messageTimer > 0 ? s.message : "",
  };
}

type TouchKey = "gas" | "brake" | "left" | "right";

export default function RaceView({
  stats,
  perks,
  ghost,
  onFinish,
}: {
  stats: PlayerStats;
  perks: RacePerks;
  ghost: GhostRun | null;
  onFinish: (r: RaceResult) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchRef = useRef({ gas: false, brake: false, left: false, right: false, fish: false });
  const [hud, setHud] = useState<Hud>(() => toHud(createRace()));

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const state = createRace(Math.random, stats, perks, ghost);
    const trails = state.racers.map(() => [] as { x: number; y: number }[]);
    const keys = new Set<string>();
    let fishPressed = false;

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((k === " " || k === "f") && !e.repeat) fishPressed = true;
      if (k === " " || k.startsWith("arrow")) e.preventDefault();
      keys.add(k);
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    const onResize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    onResize();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", onResize);

    let last = performance.now();
    let hudTimer = 0;
    let trailTimer = 0;
    let raf = 0;
    let finished = false;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const on = (...ks: string[]) => ks.some((k) => keys.has(k));
      const touch = touchRef.current;
      updateRace(state, dt, {
        throttle: (on("w", "arrowup") || touch.gas ? 1 : 0) - (on("s", "arrowdown") || touch.brake ? 1 : 0),
        steer: (on("d", "arrowright") || touch.right ? 1 : 0) - (on("a", "arrowleft") || touch.left ? 1 : 0),
        fish: fishPressed || touch.fish,
      });
      fishPressed = false;
      touch.fish = false;

      trailTimer -= dt;
      if (trailTimer <= 0) {
        trailTimer = 0.05;
        state.racers.forEach((r, i) => {
          trails[i].push({ x: r.x, y: r.y });
          if (trails[i].length > 30) trails[i].shift();
        });
      }
      draw(ctx, state, trails, now / 1000);

      hudTimer -= dt;
      if (hudTimer <= 0) {
        hudTimer = 0.1;
        setHud(toHud(state));
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
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
    };
  }, [onFinish, stats, perks, ghost]);

  // 터치 버튼: 누르는 동안만 입력이 켜진다
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

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full" />

      <div className="pointer-events-none absolute left-4 top-4 space-y-1 rounded-xl bg-black/45 px-4 py-3 text-white backdrop-blur">
        <div className="text-3xl font-black tabular-nums">{hud.rank}<span className="text-base font-semibold"> / 6위</span></div>
        <div className="text-sm">랩 {hud.lap} / {LAPS}</div>
        <div className={`text-sm tabular-nums ${remaining < 30 ? "text-red-300" : ""}`}>남은 시간 {mm}:{ss}</div>
        <div className="text-sm tabular-nums">{Math.round(hud.speed * 3.6)} km/h</div>
        <div className="text-sm">🎣 낚시 +{hud.fishCoins}</div>
        {hud.best !== null && <div className="text-sm text-sky-200">👻 베스트 {formatTime(hud.best)}</div>}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-black/45 px-3 py-2 text-xs leading-5 text-white pointer-coarse:hidden">
        W/↑ 가속 · S/↓ 감속 · A/D 조향<br />
        Space/F 낚시 (뛰어오른 물고기 근처에서)
      </div>

      <div className="absolute inset-x-0 bottom-0 hidden touch-none justify-between p-4 pointer-coarse:flex">
        <div className="flex gap-3">
          <TouchButton label="◀" {...hold("left")} />
          <TouchButton label="▶" {...hold("right")} />
        </div>
        <div className="flex items-end gap-3">
          <TouchButton label="🎣" onPointerDown={() => { touchRef.current.fish = true; }} />
          <div className="flex flex-col gap-3">
            <TouchButton label="▲" {...hold("gas")} />
            <TouchButton label="▼" {...hold("brake")} />
          </div>
        </div>
      </div>

      {hud.time < 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-8xl font-black text-white drop-shadow-lg">
          {Math.ceil(-hud.time)}
        </div>
      )}
      {hud.time >= 0 && hud.time < 1 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-7xl font-black text-yellow-300 drop-shadow-lg">
          GO!
        </div>
      )}
      <SplitBadge delta={hud.split} />
      <CatchBanner value={hud.legend} />
      {hud.message && (
        <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 rounded-full bg-white/90 px-5 py-2 text-lg font-bold text-sky-900 shadow">
          {hud.message}
        </div>
      )}
    </div>
  );
}

function TouchButton({
  label,
  ...handlers
}: { label: string } & Pick<
  React.HTMLAttributes<HTMLButtonElement>,
  "onPointerDown" | "onPointerUp" | "onPointerCancel"
>) {
  return (
    <button
      {...handlers}
      onContextMenu={(e) => e.preventDefault()}
      className="h-16 w-16 rounded-full bg-white/25 text-2xl text-white backdrop-blur active:bg-white/50"
    >
      {label}
    </button>
  );
}

function draw(
  ctx: CanvasRenderingContext2D,
  s: RaceState,
  trails: { x: number; y: number }[][],
  t: number,
) {
  const { width: w, height: h } = ctx.canvas;
  const p = s.racers[0];
  const sx = (x: number) => (x - p.x) * PX + w / 2;
  const sy = (y: number) => (y - p.y) * PX + h / 2;

  // 바다
  ctx.fillStyle = "#0b4f7a";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 2;
  const grid = 40 * PX;
  const ox = ((-p.x * PX) % grid + grid) % grid;
  const oy = ((-p.y * PX) % grid + grid) % grid;
  for (let y = oy - grid; y < h + grid; y += grid / 2) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 20) ctx.lineTo(x, y + Math.sin((x + ox) / 50 + t * 1.5) * 5);
    ctx.stroke();
  }

  // 코스 (밝은 물길)
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(56,189,248,0.35)";
  ctx.lineWidth = TRACK_HALF * 2 * PX;
  ctx.beginPath();
  s.course.forEach((c, i) => (i ? ctx.lineTo(sx(c.x), sy(c.y)) : ctx.moveTo(sx(c.x), sy(c.y))));
  ctx.closePath();
  ctx.stroke();

  // 출발선
  const a = s.course[0], b = s.course[1];
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  ctx.save();
  ctx.translate(sx(a.x), sy(a.y));
  ctx.rotate(ang);
  for (let i = -6; i < 6; i++) {
    ctx.fillStyle = i % 2 ? "#fff" : "#111";
    ctx.fillRect(-4, i * TRACK_HALF * PX / 6, 8, TRACK_HALF * PX / 6);
  }
  ctx.restore();

  // 부스트 패드
  for (const pad of s.boostPads) {
    ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(t * 6) * 0.2})`;
    ctx.beginPath();
    ctx.arc(sx(pad.x), sy(pad.y), 5 * PX, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0ea5e9";
    ctx.font = `bold ${4 * PX}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("≫", sx(pad.x), sy(pad.y));
  }

  // 부표: 다음 체크포인트는 노란 링으로 강조
  s.course.forEach((c, i) => {
    const isNext = i === p.next && p.finishTime === null;
    ctx.fillStyle = isNext ? "#facc15" : "#f97316";
    ctx.beginPath();
    ctx.arc(sx(c.x), sy(c.y), 6, 0, Math.PI * 2);
    ctx.fill();
    if (isNext) {
      ctx.strokeStyle = "rgba(250,204,21,0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx(c.x), sy(c.y), 16 + Math.sin(t * 5) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // 뛰어오르는 물고기
  for (const f of s.fish) {
    const phase = 1 - f.life / f.maxLife;
    const lift = Math.sin(phase * Math.PI) * 30;
    const near = Math.hypot(f.x - p.x, f.y - p.y) <= s.stats.catchRadius;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(sx(f.x), sy(f.y), 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "26px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(FISH[f.species].emoji, sx(f.x), sy(f.y) - lift);
    if (near) {
      ctx.fillStyle = "#facc15";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("SPACE!", sx(f.x), sy(f.y) - lift - 22);
    }
  }

  // 항적
  s.racers.forEach((r, i) => {
    const trail = trails[i];
    for (let j = 0; j < trail.length; j++) {
      ctx.fillStyle = `rgba(255,255,255,${(j / trail.length) * 0.35})`;
      ctx.beginPath();
      ctx.arc(sx(trail[j].x), sy(trail[j].y), 2 + (j / trail.length) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 레이서 (플레이어를 맨 위에)
  // 베스트 기록 고스트 (반투명)
  if (s.ghost) {
    const g = ghostPose(s.ghost, Math.max(0, s.time));
    ctx.globalAlpha = 0.4;
    drawRacer(ctx, { ...s.racers[0], name: "베스트", color: "#7dd3fc", isPlayer: false, heading: g.heading, boost: 0 }, sx(g.x), sy(g.y));
    ctx.globalAlpha = 1;
  }
  for (const r of [...s.racers].reverse()) drawRacer(ctx, r, sx(r.x), sy(r.y));

  drawMinimap(ctx, s);
}

function drawRacer(ctx: CanvasRenderingContext2D, r: Racer, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(r.heading);
  // 유선형 스키 보드
  ctx.fillStyle = r.isPlayer ? "#111827" : "#1f2937";
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.quadraticCurveTo(6, -7, -14, -5);
  ctx.lineTo(-14, 5);
  ctx.quadraticCurveTo(6, 7, 18, 0);
  ctx.fill();
  ctx.strokeStyle = r.isPlayer ? "#d4af37" : r.color; // 플레이어는 골드 라인
  ctx.lineWidth = 2;
  ctx.stroke();
  // 라이더 (플레이어는 흰색 슈트)
  ctx.fillStyle = r.isPlayer ? "#ffffff" : r.color;
  ctx.beginPath();
  ctx.ellipse(-2, 0, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = r.isPlayer ? "#e5e7eb" : "#fde68a";
  ctx.beginPath();
  ctx.arc(3, 0, 3.2, 0, Math.PI * 2);
  ctx.fill();
  if (r.boost > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.moveTo(-14, -5);
    ctx.lineTo(-26, 0);
    ctx.lineTo(-14, 5);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = "white";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(r.name, x, y - 16);
}

function drawMinimap(ctx: CanvasRenderingContext2D, s: RaceState) {
  const size = 160;
  const pad = 16;
  const x0 = ctx.canvas.width - size - pad;
  const y0 = pad;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x0, y0, size, size * 0.65);
  const scale = (size - 20) / 440;
  const mx = (x: number) => x0 + size / 2 + x * scale;
  const my = (y: number) => y0 + (size * 0.65) / 2 + y * scale;
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
