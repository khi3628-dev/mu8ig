"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

interface Topic {
  slug: string;
  label: string;
  description: string;
}

interface Props {
  topics: Topic[];
  initial: {
    topics: string[];
    region: string;
    commuteStart: string;
    commuteEnd: string;
    audioEnabled: boolean;
  };
}

export function OnboardingForm({ topics, initial }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initial.topics);
  const [region, setRegion] = useState(initial.region);
  const [commuteStart, setCommuteStart] = useState(initial.commuteStart);
  const [commuteEnd, setCommuteEnd] = useState(initial.commuteEnd);
  const [audioEnabled, setAudioEnabled] = useState(initial.audioEnabled);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const toggle = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.length === 0) {
      setError("최소 1개 이상의 토픽을 선택하세요.");
      return;
    }
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics: selected,
          region,
          commuteStart,
          commuteEnd,
          audioEnabled,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("saved");
      router.refresh();
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold mb-2">관심 토픽 (1~6개)</h2>
        <div className="grid grid-cols-2 gap-2">
          {topics.map((t) => {
            const on = selected.includes(t.slug);
            return (
              <button
                type="button"
                key={t.slug}
                onClick={() => toggle(t.slug)}
                className={cn(
                  "text-left rounded-xl border p-3 transition-colors",
                  on
                    ? "border-brand bg-brand/10"
                    : "border-border hover:bg-muted"
                )}
              >
                <div className="font-medium">{t.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t.description}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-semibold">출근 시각</span>
          <input
            type="time"
            value={commuteStart}
            onChange={(e) => setCommuteStart(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">퇴근 시각</span>
          <input
            type="time"
            value={commuteEnd}
            onChange={(e) => setCommuteEnd(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        </label>
      </section>

      <label className="block">
        <span className="text-sm font-semibold">지역 (날씨용)</span>
        <input
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={audioEnabled}
          onChange={(e) => setAudioEnabled(e.target.checked)}
        />
        오디오(TTS) 재생 사용
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={status === "saving"}
        className="w-full rounded-full bg-brand text-brand-foreground py-3 font-semibold hover:opacity-90 disabled:opacity-60"
      >
        {status === "saving" ? "저장 중…" : status === "saved" ? "저장됨 ✓" : "저장하기"}
      </button>
    </form>
  );
}
