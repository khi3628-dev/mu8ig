"use client";

import { useState } from "react";
import { Copy, Check, Bookmark } from "lucide-react";
import type { GeneratedSentence } from "@/lib/learning/types";
import { Tag } from "@/app/components/shared/Tag";
import { useT } from "@/app/components/shared/T";
import { cn } from "@/lib/learning/cn";

interface Props {
  sentence: GeneratedSentence;
  onSave: () => void;
  saved?: boolean;
}

const variantLabel: Record<GeneratedSentence["variant"], string> = {
  direct: "직접형",
  diplomatic: "완곡형",
  casual: "캐주얼형",
};

export function GeneratedSentenceCard({ sentence, onSave, saved }: Props) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sentence.en);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4 space-y-2">
      <div className="flex items-center justify-between">
        <Tag
          variant={
            sentence.variant === "direct"
              ? "brand"
              : sentence.variant === "diplomatic"
                ? "default"
                : "accent"
          }
        >
          {variantLabel[sentence.variant]}
        </Tag>
        <div className="flex items-center gap-1">
          <button
            onClick={copy}
            className="h-8 px-2 rounded-lg text-xs inline-flex items-center gap-1 border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]"
            aria-label={t("vs.copy")}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                {t("vs.copied")}
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                {t("vs.copy")}
              </>
            )}
          </button>
          <button
            onClick={onSave}
            disabled={saved}
            className={cn(
              "h-8 px-2 rounded-lg text-xs inline-flex items-center gap-1 border",
              saved
                ? "border-[var(--success)] text-[var(--success)] bg-[var(--success)]/10"
                : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]",
            )}
          >
            <Bookmark className="w-3 h-3" />
            {saved ? t("common.done") : t("vs.saveCard")}
          </button>
        </div>
      </div>
      <div className="text-base font-medium leading-relaxed">
        {sentence.en}
      </div>
      <div className="text-sm text-[var(--muted-foreground)]">
        {sentence.ko}
      </div>
      {sentence.note && (
        <div className="text-[11px] italic text-[var(--muted-foreground)] border-t border-[var(--border)] pt-2">
          {sentence.note}
        </div>
      )}
    </div>
  );
}
