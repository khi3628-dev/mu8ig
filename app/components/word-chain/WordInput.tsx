"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/app/components/shared/Button";
import { useT } from "@/app/components/shared/T";

interface Props {
  lastChar: string | null;
  disabled?: boolean;
  error?: string | null;
  onSubmit: (word: string, useAi: boolean) => void | Promise<void>;
  aiEnabled: boolean;
  submitting?: boolean;
}

export function WordInput({
  lastChar,
  disabled,
  error,
  onSubmit,
  aiEnabled,
  submitting,
}: Props) {
  const t = useT();
  const [value, setValue] = useState("");
  const [useAi, setUseAi] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled && !submitting) ref.current?.focus();
  }, [disabled, submitting]);

  const send = async () => {
    const w = value.trim();
    if (!w) return;
    await onSubmit(w, useAi && aiEnabled);
    setValue("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
        <span>
          {lastChar
            ? `${t("wc.hint.startsWith")}: `
            : ""}
          {lastChar && (
            <span className="inline-block ml-1 px-2 py-0.5 rounded bg-[var(--accent)] text-[var(--accent-foreground)] font-mono font-bold uppercase">
              {lastChar}
            </span>
          )}
        </span>
        {aiEnabled && (
          <label className="inline-flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={useAi}
              onChange={(e) => setUseAi(e.target.checked)}
              className="accent-[var(--brand)]"
            />
            <Sparkles className="w-3 h-3" />
            {t("wc.aiValidate")}
          </label>
        )}
      </div>
      <div className="flex gap-2">
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          disabled={disabled || submitting}
          placeholder={t("wc.input.placeholder")}
          className="flex-1 h-12 px-4 rounded-xl border border-[var(--border)] bg-[var(--card)] text-base disabled:opacity-50"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <Button
          onClick={send}
          disabled={disabled || !value.trim()}
          loading={submitting}
          size="lg"
          className="!h-12 !px-4 !text-base"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      {error && (
        <div className="text-sm text-[var(--danger)]">{error}</div>
      )}
    </div>
  );
}
