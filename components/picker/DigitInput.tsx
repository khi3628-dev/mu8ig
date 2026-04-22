"use client";

import { useRef, useEffect } from "react";

export function DigitInput({
  length,
  value,
  onChange,
  allowRoll = false,
  rollChar = "R",
}: {
  length: number;
  value: string;
  onChange: (next: string) => void;
  allowRoll?: boolean;
  rollChar?: string;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    refs.current = refs.current.slice(0, length);
  }, [length]);

  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  function setAt(i: number, ch: string) {
    const next = chars.slice();
    next[i] = ch;
    onChange(next.join(""));
  }

  function onInput(i: number, raw: string) {
    if (raw === "") {
      setAt(i, "");
      return;
    }
    const upper = raw.toUpperCase();
    const ch = upper.slice(-1);
    if (/^[0-9]$/.test(ch)) {
      setAt(i, ch);
      refs.current[i + 1]?.focus();
    } else if (allowRoll && ch === rollChar) {
      // ensure only one R
      const withoutExisting = chars.map((c) => (c === rollChar ? "" : c));
      withoutExisting[i] = rollChar;
      onChange(withoutExisting.join(""));
      refs.current[i + 1]?.focus();
    }
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !chars[i] && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  }

  return (
    <div className="flex gap-2">
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={c}
          onChange={(e) => onInput(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          aria-label={`자리 ${i + 1}`}
          className="w-12 h-14 sm:w-14 sm:h-16 rounded-md border border-(--border) bg-(--background) text-center font-mono text-2xl focus:outline-none focus:ring-2 focus:ring-(--brand)"
        />
      ))}
    </div>
  );
}
