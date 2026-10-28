"use client";

import { useState, type ReactNode } from "react";
import { ART, artBg } from "@/lib/boat/art";
import {
  CATALOG, GRID_W, ITEM_PERKS, PERK_CAPS, RECLAIM_COST, UPGRADES, buyUpgrade, level, luxury, perkLabel, place,
  racePerks, reclaim, sell, upgradeCost,
  type ItemId, type Save, type UpgradeId,
} from "@/lib/boat/paradise";

export type Tool = ItemId | "reclaim" | "sell";

export interface BoardProps {
  save: Save;
  tool: Tool;
  onCell: (i: number) => void;
}

export default function ParadiseView({
  save,
  onChange,
  onRace,
  board,
}: {
  save: Save;
  onChange: (s: Save) => void;
  onRace: () => void;
  board?: (props: BoardProps) => ReactNode; // 지정하면 2D 격자 대신 이 보드를 그린다
}) {
  const [tool, setTool] = useState<Tool>("palm");
  const [message, setMessage] = useState("");
  const lv = level(save);
  const lux = luxury(save);

  const apply = (i: number) => {
    const next = structuredClone(save);
    const err = tool === "reclaim" ? reclaim(next, i) : tool === "sell" ? sell(next, i) : place(next, i, tool);
    if (err) {
      setMessage(err);
      return;
    }
    setMessage("");
    onChange(next);
  };

  const upgrade = (id: UpgradeId) => {
    const next = structuredClone(save);
    const err = buyUpgrade(next, id);
    setMessage(err ?? "");
    if (!err) onChange(next);
  };

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-4 overflow-y-auto p-4 text-white md:flex-row">
      <div className="flex-1 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className="h-16 w-16 shrink-0 rounded-full border-2 border-amber-300 bg-sky-200 bg-cover bg-top shadow-lg"
              style={artBg(ART.avatar)}
              role="img"
              aria-label="내 캐릭터"
            />
            <div>
              <div className="text-xs uppercase tracking-widest text-sky-200">My Yacht Paradise</div>
              <div className="text-2xl font-black">{lv.title}</div>
              <div className="text-sm text-sky-100">
                럭셔리 {lux}
                {lv.next && <> · 다음 단계 &lsquo;{lv.next.title}&rsquo;까지 {lv.next.luxury - lux}</>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black tabular-nums text-amber-300">💰 {save.money.toLocaleString()}</div>
            <div className="text-xs text-sky-200">
              레이스 {save.races}회 · 최고 {save.bestRank ? `${save.bestRank}위` : "-"} · 물고기 {save.fishCaught}마리
            </div>
          </div>
        </div>

        {board ? (
          board({ save, tool, onCell: apply })
        ) : (
          <div
            className="grid gap-1 rounded-xl bg-sky-900/60 p-2"
            style={{ gridTemplateColumns: `repeat(${GRID_W}, minmax(0, 1fr))` }}
          >
            {save.cells.map((c, i) => (
              <button
                key={i}
                onClick={() => apply(i)}
                className={`aspect-square rounded text-xl transition hover:ring-2 hover:ring-white/70 sm:text-2xl ${
                  c.terrain === "sand" ? "bg-amber-200" : "bg-sky-500/70"
                }`}
                title={c.item ? CATALOG[c.item].name : c.terrain === "sand" ? "모래섬" : "바다"}
              >
                {c.item ? CATALOG[c.item].emoji : ""}
              </button>
            ))}
          </div>
        )}
        <div className="h-5 text-sm text-red-200">{message}</div>
      </div>

      <div className="w-full space-y-3 md:w-64">
        <button
          onClick={onRace}
          className="w-full rounded-xl bg-white py-4 text-lg font-black text-sky-900 shadow-lg transition hover:bg-amber-200"
        >
          🏁 레이스 출전
        </button>

        <PerkPanel save={save} />

        <div className="rounded-xl bg-black/30 p-2">
          <div className="px-1 pb-1 text-xs text-sky-200">수상스키 정비소</div>
          <div className="space-y-1">
            {(Object.keys(UPGRADES) as UpgradeId[]).map((id) => {
              const u = UPGRADES[id];
              const lv = save.upgrades[id];
              const cost = upgradeCost(save, id);
              return (
                <button
                  key={id}
                  onClick={() => upgrade(id)}
                  disabled={cost === null}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm transition hover:bg-white/10 ${
                    cost !== null && save.money < cost ? "opacity-50" : ""
                  }`}
                >
                  <span>
                    <span className="font-semibold">{u.emoji} {u.name}</span>
                    <span className="ml-1 text-amber-300">{"★".repeat(lv)}{"☆".repeat(u.costs.length - lv)}</span>
                    <span className="block text-[11px] text-sky-200">{u.desc}</span>
                  </span>
                  <span className="tabular-nums">{cost === null ? "MAX" : cost.toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl bg-black/30 p-2">
          <div className="px-1 pb-1 text-xs text-sky-200">건설 도구 (선택 후 칸 클릭)</div>
          <div className="space-y-1">
            {(Object.keys(CATALOG) as ItemId[]).map((id) => {
              const d = CATALOG[id];
              return (
                <ToolButton
                  key={id}
                  active={tool === id}
                  disabled={save.money < d.cost}
                  onClick={() => setTool(id)}
                  label={`${d.emoji} ${d.name}`}
                  sub={[d.on === "sand" ? "섬" : d.needsDock ? "부두 옆" : "바다", `럭셔리 ${d.luxury}`, perkLabel(ITEM_PERKS[id] ?? {})]
                    .filter(Boolean)
                    .join(" · ")}
                  cost={d.cost}
                />
              );
            })}
            <ToolButton
              active={tool === "reclaim"}
              disabled={save.money < RECLAIM_COST}
              onClick={() => setTool("reclaim")}
              label="🏝️ 섬 확장"
              sub="섬에 붙은 바다를 메움"
              cost={RECLAIM_COST}
            />
            <ToolButton
              active={tool === "sell"}
              onClick={() => setTool("sell")}
              label="💸 팔기"
              sub="건설비의 50% 환급"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 지금 섬이 레이스에 주는 효과. 건설이 레이스와 이어진다는 걸 보여준다.
function PerkPanel({ save }: { save: Save }) {
  const p = racePerks(save);
  const rows: { label: string; value: string; on: boolean; max: boolean }[] = [
    { label: "🏖️ 순위 상금", value: `+${Math.round(p.prize * 100)}%`, on: p.prize > 0, max: p.prize >= PERK_CAPS.prize },
    { label: "🍹 낚시 코인", value: `+${Math.round(p.fish * 100)}%`, on: p.fish > 0, max: p.fish >= PERK_CAPS.fish },
    { label: "⛵ 출발 대시", value: `+${Math.round(p.startSpeed * 3.6)}km/h`, on: p.startSpeed > 0, max: p.startSpeed >= PERK_CAPS.startSpeed },
    { label: "🗼 파도 부스트", value: `+${Math.round(p.boost * 100)}%`, on: p.boost > 0, max: p.boost >= PERK_CAPS.boost },
  ];
  const any = rows.some((r) => r.on);
  return (
    <div className="rounded-xl bg-black/30 p-3 text-sm">
      <div className="pb-1 text-xs text-sky-200">내 섬의 레이스 효과</div>
      <div className="space-y-0.5">
        {rows.map((r) => (
          <div key={r.label} className={`flex justify-between ${r.on ? "" : "opacity-45"}`}>
            <span>{r.label}</span>
            <span className="tabular-nums font-semibold text-amber-200">
              {r.value}
              {r.max && <span className="ml-1 text-[10px] text-sky-200">MAX</span>}
            </span>
          </div>
        ))}
      </div>
      {!any && <div className="pt-1 text-[11px] text-sky-200">시설을 지으면 다음 레이스부터 유리해진다</div>}
    </div>
  );
}

function ToolButton({
  active, disabled, onClick, label, sub, cost,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  cost?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm transition ${
        active ? "bg-white text-sky-900" : "hover:bg-white/10"
      } ${disabled && !active ? "opacity-50" : ""}`}
    >
      <span>
        <span className="font-semibold">{label}</span>
        <span className={`block text-[11px] ${active ? "text-sky-700" : "text-sky-200"}`}>{sub}</span>
      </span>
      {cost !== undefined && <span className="tabular-nums">{cost.toLocaleString()}</span>}
    </button>
  );
}
