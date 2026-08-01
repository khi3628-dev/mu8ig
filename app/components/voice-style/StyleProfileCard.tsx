"use client";

import type { StyleProfile } from "@/lib/learning/types";
import { Tag } from "@/app/components/shared/Tag";
import { useT } from "@/app/components/shared/T";
import { Sparkles } from "lucide-react";

const toneColor: Record<StyleProfile["tone"], "default" | "brand" | "accent"> = {
  formal: "brand",
  semiformal: "default",
  casual: "accent",
};

export function StyleProfileCard({ profile }: { profile: StyleProfile }) {
  const t = useT();
  return (
    <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 space-y-3">
      <div className="flex items-center gap-2 text-xs uppercase text-[var(--brand)] font-semibold">
        <Sparkles className="w-3.5 h-3.5" />
        {t("vs.profile")}
      </div>
      <div className="flex flex-wrap gap-2">
        <Tag variant={toneColor[profile.tone]}>
          {t("vs.tone")}: {profile.tone}
        </Tag>
        <Tag>
          {t("vs.pacing")}: {profile.pacing}
        </Tag>
        <Tag variant="brand">
          {t("vs.politeness")}: {profile.politenessLevel}/5
        </Tag>
      </div>
      <div>
        <div className="text-xs text-[var(--muted-foreground)]">
          {t("vs.summary")}
        </div>
        <div className="text-sm mt-0.5">{profile.summaryKo}</div>
      </div>
      <div>
        <div className="text-xs text-[var(--muted-foreground)]">Fillers</div>
        <div className="flex flex-wrap gap-1 mt-1">
          {profile.fillers.map((f) => (
            <Tag key={f}>{f}</Tag>
          ))}
        </div>
      </div>
      <div className="rounded-xl bg-[var(--brand-muted)] p-3">
        <div className="text-[11px] uppercase text-[var(--brand)] font-semibold">
          Voice sample
        </div>
        <div className="text-sm mt-1 italic">
          &ldquo;{profile.exampleEnVoice}&rdquo;
        </div>
      </div>
    </div>
  );
}
