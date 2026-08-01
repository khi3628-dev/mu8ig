"use client";

import { useLocaleStore } from "@/app/state/localeStore";
import situationsData from "@/lib/data/voice-situations.json";
import type { VoiceSituation } from "@/lib/learning/types";
import { cn } from "@/lib/learning/cn";

const situations = situationsData as VoiceSituation[];

interface Props {
  value: string | null;
  onChange: (id: string) => void;
}

export function SituationPicker({ value, onChange }: Props) {
  const locale = useLocaleStore((s) => s.locale);
  return (
    <div className="grid grid-cols-2 gap-2">
      {situations.map((s) => {
        const active = s.id === value;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={cn(
              "text-left rounded-xl border p-3 transition",
              active
                ? "border-[var(--brand)] bg-[var(--brand-muted)] text-[var(--brand)]"
                : "border-[var(--border)] bg-[var(--card)]",
            )}
          >
            <div className="text-sm font-semibold leading-tight">
              {locale === "ko" ? s.ko : s.en}
            </div>
            <div className="text-[11px] text-[var(--muted-foreground)] mt-1 line-clamp-2">
              {s.contextKo}
            </div>
          </button>
        );
      })}
    </div>
  );
}
