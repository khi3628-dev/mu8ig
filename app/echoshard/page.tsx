'use client';

/* eslint-disable react-hooks/immutability --
 * 이 화면은 20Hz로 도는 가변 시뮬레이션 객체(World)를 ref로 들고 직접 변형한다.
 * 매 틱 새 객체를 만들면 경기당 수만 개의 유닛 스냅샷이 생겨 프레임이 유지되지 않는다.
 * React 상태로 올리는 것은 HUD 스냅샷(초당 10회)뿐이다.
 */

// 에코샤드 프로토타입 — 1인 플레이(봇 9기) 화면
//
// 검증 목표: "15분 경기감". 5분 천정 고래 → 8분 세계 접힘 → 10분 심층 고래 → 14분 과부하가
// 실제로 긴장과 결전을 만드는지 손으로 확인하기 위한 화면이다.
// 그래서 HUD 최상단이 체력이나 골드가 아니라 '다음 사건까지 남은 시간'이다.

import { useCallback, useEffect, useRef, useState } from 'react';
import { DT, HEROES, HERO_ORDER, TIMETABLE } from '@/lib/echoshard/config';
import { World, dist, norm, pickAutoTarget } from '@/lib/echoshard/sim';
import { renderMinimap, renderTerrain, renderWorld, screenToWorld, pickUnitAt, type Camera } from '@/lib/echoshard/render';
import type { Team, Vec2 } from '@/lib/echoshard/types';

type Slot = 'Q' | 'W' | 'E' | 'R';
const SLOTS: Slot[] = ['Q', 'W', 'E', 'R'];

const EVENT_LABELS: { t: number; label: string }[] = [
  { t: TIMETABLE.FIRST_WAVE, label: '첫 미니언 웨이브' },
  { t: TIMETABLE.SCOUT_NODE_SPAWN, label: '강 정찰핵' },
  { t: TIMETABLE.SKY_WHALE_SPAWN, label: '천정 고래' },
  { t: TIMETABLE.WORLD_FOLD_STAGE_1, label: '세계 접힘' },
  { t: TIMETABLE.DEEP_WHALE_SPAWN, label: '심층 고래' },
  { t: TIMETABLE.MINION_SCALING_2, label: '미니언 강화 II' },
  { t: TIMETABLE.CORE_OVERLOAD, label: '직조핵 과부하' },
  { t: TIMETABLE.WORLD_FOLD_FINAL, label: '최종 접힘' },
];

function mmss(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface Hud {
  time: number;
  hp: number;
  maxHp: number;
  level: number;
  gold: number;
  kda: [number, number, number];
  cooldowns: Record<string, number>;
  skillLevels: Record<string, number>;
  teamGold: [number, number];
  kills: [number, number];
  items: string[];
  alive: boolean;
  respawnIn: number;
  over: boolean;
  winner: Team | null;
  folded: boolean;
  coreOpen: [boolean, boolean];
}

export default function EchoShardPage() {
  const [heroId, setHeroId] = useState<string>('GAON');
  const [started, setStarted] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
  const [hud, setHud] = useState<Hud | null>(null);
  const [targetMode, setTargetMode] = useState<'HERO_PRIORITY' | 'MINION_PRIORITY'>('HERO_PRIORITY');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const terrainRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<Camera>({ center: { x: 60, y: 60 }, scale: 12 });
  const keysRef = useRef<Set<string>>(new Set());
  const pointerRef = useRef<Vec2 | null>(null);
  const stickRef = useRef<{ id: number; origin: Vec2; current: Vec2 } | null>(null);
  const rafRef = useRef<number>(0);
  const accRef = useRef(0);
  const lastRef = useRef(0);
  const timeScaleRef = useRef(1);
  const targetModeRef = useRef(targetMode);

  useEffect(() => {
    timeScaleRef.current = timeScale;
  }, [timeScale]);
  useEffect(() => {
    targetModeRef.current = targetMode;
  }, [targetMode]);

  const start = useCallback(() => {
    const w = new World({ seed: Math.floor(Math.random() * 1e9), playerHero: heroId, playerTeam: 0 });
    worldRef.current = w;
    terrainRef.current = renderTerrain(w);
    const p = w.player;
    if (p) cameraRef.current.center = { ...p.pos };
    accRef.current = 0;
    lastRef.current = performance.now();
    setStarted(true);
  }, [heroId]);

  // 스킬 시전
  const cast = useCallback((slot: Slot) => {
    const w = worldRef.current;
    const p = w?.player;
    if (!w || !p || !p.alive) return;
    const aim = pointerRef.current ?? { x: p.pos.x + p.facing.x * 5, y: p.pos.y + p.facing.y * 5 };
    const unit = pickUnitAt(w, aim, 0, 2.5);
    w.cast(p, slot, aim, unit?.id);
  }, []);

  // 키보드
  useEffect(() => {
    if (!started) return;
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current.add(k);
      // WASD가 이동이므로 W 스킬은 F에, 대상 우선순위 전환은 X에 배치한다.
      if (k === 'q') cast('Q');
      if (k === 'e') cast('E');
      if (k === 'r') cast('R');
      if (k === 'f') cast('W');
      if (k === 'x') setTargetMode((m) => (m === 'HERO_PRIORITY' ? 'MINION_PRIORITY' : 'HERO_PRIORITY'));
      if (k === ' ') e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [started, cast]);

  // 메인 루프
  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    const mini = miniRef.current;
    if (!canvas || !mini) return;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d')!;
    const mctx = mini.getContext('2d')!;
    let hudTimer = 0;

    const frame = (now: number) => {
      rafRef.current = requestAnimationFrame(frame);
      const w = worldRef.current;
      if (!w) return;
      const dtReal = Math.min(0.25, (now - lastRef.current) / 1000);
      lastRef.current = now;

      if (!w.over) {
        accRef.current += dtReal * timeScaleRef.current;
        let steps = 0;
        while (accRef.current >= DT && steps < 40) {
          applyInput(w);
          w.step();
          accRef.current -= DT;
          steps++;
        }
      }

      // 카메라: 자기 중심 반고정 (GDD 3.6)
      const p = w.player;
      if (p) {
        const c = cameraRef.current.center;
        const target = p.alive ? p.pos : p.pos;
        c.x += (target.x - c.x) * Math.min(1, dtReal * 8);
        c.y += (target.y - c.y) * Math.min(1, dtReal * 8);
      }
      // 세로로 약 68m가 보이도록. GDD 3.8은 영웅 실루엣이 화면 높이의 5.5~7.5%를 차지하라고 하는데,
      // 영웅 지름 1.8m 기준 68m 시야에서 약 2.6%다. 프로토타입은 전장 판단을 우선해 더 넓게 본다.
      cameraRef.current.scale = (canvas.height / 68) * (canvas.width < canvas.height ? 0.75 : 1);

      if (w.field.folded && terrainRef.current && !terrainRef.current.dataset.folded) {
        terrainRef.current = renderTerrain(w);
        terrainRef.current.dataset.folded = '1';
      }

      renderWorld(ctx, w, {
        viewer: 0,
        camera: cameraRef.current,
        terrain: terrainRef.current!,
        terrainPx: 5,
        aiming: null,
        pointer: pointerRef.current,
      });
      renderMinimap(mctx, w, terrainRef.current!, 0);

      hudTimer += dtReal;
      if (hudTimer > 0.1) {
        hudTimer = 0;
        setHud(snapshot(w));
      }
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [started]);

  const applyInput = (w: World) => {
    const p = w.player;
    if (!p || !p.alive) return;
    let dir: Vec2 = { x: 0, y: 0 };
    const k = keysRef.current;
    if (k.has('w') || k.has('arrowup')) dir.y -= 1;
    if (k.has('s') || k.has('arrowdown')) dir.y += 1;
    if (k.has('a') || k.has('arrowleft')) dir.x -= 1;
    if (k.has('d') || k.has('arrowright')) dir.x += 1;

    const stick = stickRef.current;
    if (stick) {
      const raw = { x: stick.current.x - stick.origin.x, y: stick.current.y - stick.origin.y };
      const len = Math.hypot(raw.x, raw.y);
      // GDD 3.6: 중앙 12% 데드존, 최대 반경 110dp
      if (len > 110 * 0.12) dir = norm(raw);
    }
    p.moveDir = dir.x || dir.y ? norm(dir) : { x: 0, y: 0 };

    // 기본 공격 대상 (GDD 3.7 우선순위)
    const cur = p.targetId ? w.units.get(p.targetId) : null;
    const range = p.stats.attackRange + p.radius + 1.5;
    if (!cur || !cur.alive || dist(p.pos, cur.pos) > range) {
      p.targetId = pickAutoTarget(w, p, targetModeRef.current)?.id;
    }
  };

  // 포인터
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    pointerRef.current = screenToWorld((e.clientX - rect.left) * dpr, (e.clientY - rect.top) * dpr, canvas, cameraRef.current);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    onPointerMove(e);
    const w = worldRef.current;
    const p = w?.player;
    if (!w || !p || !pointerRef.current) return;
    const u = pickUnitAt(w, pointerRef.current, 0, 2.5);
    if (u) p.targetId = u.id;
  };

  // 가상 스틱
  const stickAreaRef = useRef<HTMLDivElement>(null);
  const onStickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    stickRef.current = { id: e.pointerId, origin: { x: e.clientX, y: e.clientY }, current: { x: e.clientX, y: e.clientY } };
  };
  const onStickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickRef.current?.id !== e.pointerId) return;
    stickRef.current.current = { x: e.clientX, y: e.clientY };
  };
  const onStickUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickRef.current?.id !== e.pointerId) return;
    stickRef.current = null;
  };

  if (!started) {
    return <StartScreen heroId={heroId} setHeroId={setHeroId} onStart={start} />;
  }

  const spec = HEROES[heroId];
  const nextEvent = EVENT_LABELS.find((e) => e.t > (hud?.time ?? 0));

  return (
    <div className="fixed inset-0 bg-[#080b12] text-[#e8edf7] select-none overflow-hidden touch-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
      />

      {/* 상단: 경기 시간표 — 이 프로토타입이 검증하려는 대상 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-2">
        <div className="rounded-lg bg-black/55 px-3 py-1.5 backdrop-blur">
          <div className="flex items-center gap-3 text-sm tabular-nums">
            <span className="text-[#4da3ff]">{Math.round(hud?.teamGold[0] ?? 0).toLocaleString()}</span>
            <span className="text-[#4da3ff]">{hud?.kills[0] ?? 0}</span>
            <span className="text-base font-semibold">{mmss(hud?.time ?? 0)}</span>
            <span className="text-[#ff5f6d]">{hud?.kills[1] ?? 0}</span>
            <span className="text-[#ff5f6d]">{Math.round(hud?.teamGold[1] ?? 0).toLocaleString()}</span>
          </div>
          {nextEvent && (
            <div className="mt-0.5 text-center text-[11px] text-[#ffd166]">
              {nextEvent.label} · {mmss(nextEvent.t - (hud?.time ?? 0))}
            </div>
          )}
        </div>
      </div>

      {/* 미니맵 */}
      <div className="absolute right-2 top-14 rounded-lg bg-black/50 p-1 backdrop-blur">
        <canvas ref={miniRef} width={132} height={132} className="block h-[132px] w-[132px] rounded" />
        <div className="mt-1 flex gap-1 text-[10px]">
          {[1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setTimeScale(s)}
              className={`flex-1 rounded px-1 py-0.5 ${timeScale === s ? 'bg-[#4da3ff] text-black' : 'bg-white/10'}`}
            >
              ×{s}
            </button>
          ))}
        </div>
      </div>

      {/* 좌하단: 가상 스틱 */}
      <div
        ref={stickAreaRef}
        onPointerDown={onStickDown}
        onPointerMove={onStickMove}
        onPointerUp={onStickUp}
        onPointerCancel={onStickUp}
        className="absolute bottom-0 left-0 h-1/2 w-2/5"
      >
        <div className="absolute bottom-8 left-8 h-28 w-28 rounded-full border border-white/15 bg-white/5" />
      </div>

      {/* 우하단: 스킬 */}
      <div className="absolute bottom-4 right-4 flex items-end gap-2">
        <button
          onClick={() => setTargetMode((m) => (m === 'HERO_PRIORITY' ? 'MINION_PRIORITY' : 'HERO_PRIORITY'))}
          className="mb-1 h-12 w-12 whitespace-pre-line rounded-full border border-white/20 bg-black/50 text-[10px] leading-tight backdrop-blur"
        >
          {targetMode === 'HERO_PRIORITY' ? '영웅\n우선' : '미니언\n우선'}
        </button>
        {SLOTS.map((slot) => {
          const cd = hud?.cooldowns[slot] ?? 0;
          const lvl = hud?.skillLevels[slot] ?? 0;
          return (
            <button
              key={slot}
              onPointerDown={(e) => {
                e.preventDefault();
                cast(slot);
              }}
              disabled={lvl <= 0}
              className={`relative h-16 w-16 rounded-full border text-sm font-semibold backdrop-blur ${
                lvl <= 0 ? 'border-white/10 bg-black/40 text-white/25' : cd > 0 ? 'border-white/15 bg-black/60 text-white/40' : 'border-[#4da3ff]/70 bg-[#12203a]/80'
              }`}
            >
              <span className="block text-[10px] opacity-70">{spec.abilities[slot].name}</span>
              <span>{slot}</span>
              {cd > 0 && <span className="absolute inset-0 flex items-center justify-center text-lg tabular-nums">{cd.toFixed(1)}</span>}
            </button>
          );
        })}
      </div>

      {/* 좌상단 상태 (좌하단은 가상 스틱 영역이라 겹친다) */}
      <div className="pointer-events-none absolute left-2 top-2 w-56 rounded-lg bg-black/55 p-2 text-xs backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="font-semibold">
            {spec.name} <span className="text-[#ffd166]">Lv {hud?.level ?? 1}</span>
          </span>
          <span className="tabular-nums text-[#ffd166]">{Math.round(hud?.gold ?? 0)} G</span>
        </div>
        <div className="mt-1 h-2 w-full rounded bg-white/10">
          <div className="h-2 rounded bg-[#4da3ff]" style={{ width: `${((hud?.hp ?? 0) / (hud?.maxHp || 1)) * 100}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-[#8b97ad]">
          <span>
            {Math.round(hud?.hp ?? 0)} / {Math.round(hud?.maxHp ?? 0)}
          </span>
          <span>
            {hud?.kda[0]} / {hud?.kda[1]} / {hud?.kda[2]}
          </span>
        </div>
        {hud?.items.length ? <div className="mt-1 text-[10px] text-[#8b97ad]">{hud.items.join(' · ')}</div> : null}
        {hud && !hud.alive && <div className="mt-1 text-[#ff5f6d]">재결속 {hud.respawnIn.toFixed(1)}초</div>}
        {hud?.folded && <div className="mt-1 text-[#ffd166]">세계 접힘 — 외곽 벽 개방됨</div>}
      </div>

      {/* 조작 안내 */}
      <div className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 text-center text-[10px] text-white/35">
        WASD 이동 · 마우스 조준 · Q / F / E / R 스킬 · X 대상 우선순위 · 클릭 수동 지정
      </div>

      {hud?.over && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur">
          <div className="rounded-xl border border-white/15 bg-[#0d1420] p-6 text-center">
            <div className="text-2xl font-semibold">{hud.winner === 0 ? '승리' : hud.winner === 1 ? '패배' : '무승부'}</div>
            <div className="mt-1 text-sm text-[#8b97ad]">경기 시간 {mmss(hud.time)}</div>
            <div className="mt-1 text-xs text-[#8b97ad]">문서 목표: 실전 P50 13:00~15:00</div>
            <button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-[#4da3ff] px-4 py-2 text-sm font-semibold text-black">
              다시 하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function snapshot(w: World): Hud {
  const p = w.player;
  return {
    time: w.time,
    hp: p?.stats.hp ?? 0,
    maxHp: p?.stats.maxHp ?? 1,
    level: p?.level ?? 1,
    gold: p?.gold ?? 0,
    kda: [p?.kills ?? 0, p?.deaths ?? 0, p?.assists ?? 0],
    cooldowns: { ...(p?.cooldowns ?? {}) },
    skillLevels: { ...(p?.skillLevels ?? {}) },
    teamGold: [w.teamNetWorth(0), w.teamNetWorth(1)],
    kills: [w.teams[0].kills, w.teams[1].kills],
    items: (p?.items ?? []).map((id) => id),
    alive: p?.alive ?? true,
    respawnIn: p?.respawnIn ?? 0,
    over: w.over,
    winner: w.winner,
    folded: w.field.folded,
    coreOpen: [w.coreVulnerable(0), w.coreVulnerable(1)],
  };
}

function StartScreen({ heroId, setHeroId, onStart }: { heroId: string; setHeroId: (id: string) => void; onStart: () => void }) {
  return (
    <div className="min-h-screen bg-[#080b12] p-6 text-[#e8edf7]">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs tracking-[0.3em] text-[#8b97ad]">ORIGINAL IP · PLAYABLE PROTOTYPE</p>
        <h1 className="mt-2 text-3xl font-semibold">에코샤드: 접힌 세계의 전쟁</h1>
        <p className="mt-2 text-sm text-[#8b97ad]">
          기획서의 15분 경기 구조를 손으로 확인하기 위한 1인 플레이 프로토타입입니다. 5 대 5 구조는 유지하되 나머지 9명은 봇입니다.
        </p>

        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-sm font-semibold text-[#ffd166]">이 프로토타입이 검증하려는 것</h2>
          <ul className="mt-2 space-y-1 text-sm text-[#b8c2d4]">
            <li>5:00 천정 고래 · 8:00 세계 접힘 · 10:00 심층 고래 · 14:00 과부하가 긴장을 만드는가</li>
            <li>경기가 13~15분 안에 결판나는가</li>
            <li>접힘이 이동 거리를 줄여 교전 위치를 실제로 바꾸는가</li>
          </ul>
        </div>

        <h2 className="mt-6 text-sm font-semibold">영웅 선택</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {HERO_ORDER.map((id) => {
            const h = HEROES[id];
            const active = heroId === id;
            return (
              <button
                key={id}
                onClick={() => setHeroId(id)}
                className={`rounded-xl border p-3 text-left transition ${active ? 'border-[#4da3ff] bg-[#4da3ff]/10' : 'border-white/10 bg-white/[0.02] hover:border-white/25'}`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">{h.name}</span>
                  <span className="text-[11px] text-[#8b97ad]">
                    {roleName(h.role)} · 난도 {h.difficulty}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-[#8b97ad]">{h.faction}</div>
                <div className="mt-1 text-[11px] text-[#b8c2d4]">
                  Q {h.abilities.Q.name} · W {h.abilities.W.name} · E {h.abilities.E.name} · R {h.abilities.R.name}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button onClick={onStart} className="rounded-lg bg-[#4da3ff] px-5 py-2.5 font-semibold text-black">
            경기 시작
          </button>
          <a href="/echoshard/lab" className="rounded-lg border border-white/20 px-5 py-2.5 text-sm">
            배치 시뮬레이션 실험실
          </a>
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-[#6d7994]">
          조작: WASD 이동, 마우스 조준, Q / F / E / R 스킬(F가 W 스킬), X 대상 우선순위 전환, 클릭으로 수동 지정.
          모바일은 좌측 화면 드래그로 이동하고 우측 버튼으로 스킬을 씁니다.
        </p>
      </div>
    </div>
  );
}

function roleName(role: string): string {
  return { GUARDIAN: '수호자', STALKER: '추적자', MAGE: '술사', MARKSMAN: '사수', CONDUCTOR: '조율자' }[role] ?? role;
}
