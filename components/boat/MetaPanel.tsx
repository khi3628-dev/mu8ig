"use client";

import { useState } from "react";
import {
  SKINS, canUse, buySkin, claimMission, equipSkin, grantSupporter, missionDef, nextDailyReward,
  type MetaSave, type MissionKind,
} from "@/lib/boat/meta";
import type { Platform } from "./platform";

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
type Tab = "missions" | "shop" | "settings";

// 파라다이스 화면 오른쪽: 일일 미션 · 스킨 상점 · 설정(음량, 서포터 팩)
export default function MetaPanel({
  meta,
  money,
  platform,
  onMeta,
  onMoney,
}: {
  meta: MetaSave;
  money: number;
  platform: Platform | null;
  onMeta: (m: MetaSave | ((prev: MetaSave) => MetaSave)) => void; // React setState 그대로 받는다
  onMoney: (delta: number) => void;
}) {
  const [tab, setTab] = useState<Tab>("missions");
  const [buying, setBuying] = useState(false);
  const [note, setNote] = useState("");
  const ready = meta.missions.filter((m) => !m.claimed && m.progress >= missionDef(m.kind).target).length;

  const claim = (kind: MissionKind) => {
    const next = structuredClone(meta);
    const amount = claimMission(next, kind);
    if (!amount) return;
    onMeta(next);
    onMoney(amount);
    setNote(`미션 보상 +${amount.toLocaleString()} CR`);
  };

  const pick = (id: string) => {
    const next = structuredClone(meta);
    if (canUse(next, id)) {
      equipSkin(next, id);
      onMeta(next);
      setNote("");
      return;
    }
    const r = buySkin(next, id, money);
    if ("error" in r) {
      setNote(r.error);
      return;
    }
    onMeta(next);
    onMoney(r.money - money);
    setNote("스킨을 샀어요. 다음 레이스부터 적용");
  };

  const buySupporter = async () => {
    if (!platform || buying) return;
    setBuying(true);
    try {
      const ok = await platform.purchase("supporter");
      if (!ok) return;
      // 결제를 기다리는 동안 바뀐 미션·스킨을 잃지 않게 최신 상태에서 갱신한다
      onMeta((prev) => {
        const next = structuredClone(prev);
        grantSupporter(next);
        return next;
      });
      setNote("서포터 팩 적용 · 감사합니다!");
    } finally {
      setBuying(false);
    }
  };

  const setVol = (key: "music" | "sfx", v: number) => {
    const next = structuredClone(meta);
    next.settings[key] = v;
    onMeta(next);
  };

  return (
    <div className="rounded-xl bg-black/30 p-2">
      <div className="mb-2 grid grid-cols-3 gap-1 text-[11px] font-bold tracking-wide" role="tablist">
        {([
          ["missions", ready ? `MISSION ${ready}` : "MISSION"],
          ["shop", "SHOP"],
          ["settings", "SETTING"],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-md py-1.5 ${tab === t ? "bg-white text-slate-950" : "bg-white/10 hover:bg-white/20"} ${
              t === "missions" && ready ? "ring-2 ring-amber-300" : ""
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "missions" && (
        <div className="space-y-1.5">
          <div className="px-1 text-[11px] text-sky-200">오늘의 미션 · 자정에 새로 바뀜</div>
          {meta.missions.map((m) => {
            const def = missionDef(m.kind);
            const done = m.progress >= def.target;
            return (
              <div key={m.kind} className="rounded-lg bg-white/5 px-2.5 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className={m.claimed ? "text-white/40 line-through" : ""}>{def.text}</span>
                  {done && !m.claimed ? (
                    <button onClick={() => claim(m.kind)} className="shrink-0 rounded bg-amber-300 px-2 py-0.5 text-xs font-black text-slate-950">
                      +{def.reward}
                    </button>
                  ) : (
                    <span className="shrink-0 text-xs text-amber-200/80">{m.claimed ? "완료" : `${def.reward} CR`}</span>
                  )}
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-white/10" aria-label={`${m.progress}/${def.target}`}>
                  <div className="h-full bg-amber-300" style={{ width: `${(m.progress / def.target) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "shop" && (
        <div className="grid grid-cols-2 gap-1.5">
          {SKINS.map((s) => {
            const usable = canUse(meta, s.id);
            const equipped = meta.skin === s.id;
            return (
              <button
                key={s.id}
                onClick={() => (s.supporter && !usable ? (platform?.purchaseAvailable ? setTab("settings") : setNote("서포터 팩 전용 스킨")) : pick(s.id))}
                className={`rounded-lg p-2 text-left text-xs transition hover:bg-white/15 ${equipped ? "bg-white/20 ring-2 ring-amber-300" : "bg-white/5"}`}
              >
                <div className="mb-1.5 flex h-6 overflow-hidden rounded" aria-hidden>
                  <span className="flex-[3]" style={{ background: hex(s.deck) }} />
                  <span className="flex-1" style={{ background: hex(s.stripe) }} />
                  <span className="flex-[2]" style={{ background: hex(s.suit) }} />
                </div>
                <div className="font-semibold">{s.name}</div>
                <div className={equipped ? "text-amber-300" : "text-white/60"}>
                  {equipped ? "장착 중" : usable ? "장착" : s.supporter ? "서포터 전용" : `${s.price.toLocaleString()} CR`}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-3 px-1 py-1 text-sm">
          {(["music", "sfx"] as const).map((k) => (
            <label key={k} className="block">
              <span className="flex justify-between text-xs text-sky-200">
                <span>{k === "music" ? "배경음악" : "효과음"}</span>
                <span>{Math.round(meta.settings[k] * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(meta.settings[k] * 100)}
                onChange={(e) => setVol(k, Number(e.target.value) / 100)}
                className="w-full accent-amber-300"
              />
            </label>
          ))}
          {(meta.supporter || platform?.purchaseAvailable) && (
          <div className="rounded-lg bg-gradient-to-br from-amber-300/25 to-white/5 p-2.5">
            <div className="text-xs font-black tracking-[0.2em] text-amber-200">SUPPORTER PACK</div>
            <div className="mt-1 text-xs text-white/80">전용 스킨 2종(플래티넘·로열 퍼플) + 레이스 사이 광고 제거</div>
            {meta.supporter ? (
              <div className="mt-2 text-xs font-bold text-amber-300">적용됨 · 응원해 주셔서 감사합니다</div>
            ) : (
              <button
                onClick={buySupporter}
                disabled={buying}
                className="mt-2 w-full rounded bg-amber-300 py-1.5 text-xs font-black text-slate-950 disabled:opacity-50"
              >
                {buying ? "결제 중…" : "서포터 팩 구매"}
              </button>
            )}
          </div>
          )}
          <a href="/boat/privacy" target="_blank" rel="noopener" className="block text-[11px] text-sky-200 underline">개인정보처리방침</a>
        </div>
      )}

      <div className="mt-1 min-h-4 px-1 text-xs text-amber-200" aria-live="polite">{note}</div>
    </div>
  );
}

// 파라다이스에 들어올 때 하루 한 번 띄우는 접속 보상
export function DailyModal({
  meta,
  today,
  platform,
  onClaim,
}: {
  meta: MetaSave;
  today: string;
  platform: Platform | null;
  onClaim: (bonusAd: boolean) => void;
}) {
  const { day, amount } = nextDailyReward(meta, today);
  const [busy, setBusy] = useState(false);
  return (
    <div className="absolute inset-0 z-30 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4" role="dialog" aria-label="매일 접속 보상">
      <div className="my-auto w-full max-w-sm rounded-md bg-slate-950 p-5 text-center text-white shadow-2xl ring-1 ring-white/10">
        <div className="text-[11px] font-black tracking-[0.3em] text-amber-300">DAILY BONUS · DAY {day}/7</div>
        <div className="mt-3 flex justify-center gap-1" aria-hidden>
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className={`h-2 w-6 -skew-x-12 ${i < day ? "bg-amber-300" : "bg-white/15"}`} />
          ))}
        </div>
        <div className="mt-4 text-4xl font-black italic text-amber-300">+{amount.toLocaleString()} CR</div>
        <div className="mt-1 text-xs text-white/60">매일 들어오면 보상이 커져요. 7일째 1,500 CR</div>
        <div className="mt-5 grid gap-2">
          {platform?.rewardedAvailable && (
            <button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                onClaim(true);
              }}
              className="-skew-x-12 bg-amber-300 py-2.5 font-black italic text-slate-950 disabled:opacity-50"
            >
              <span className="inline-block skew-x-12">광고 보고 2배 받기</span>
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              onClaim(false);
            }}
            className="-skew-x-12 bg-white py-2.5 font-black italic text-slate-950 disabled:opacity-50"
          >
            <span className="inline-block skew-x-12">받기</span>
          </button>
        </div>
      </div>
    </div>
  );
}
