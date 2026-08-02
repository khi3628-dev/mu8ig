"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Square } from "lucide-react";
import { speak, type TtsHandle } from "@/lib/tts";
import { cn } from "@/lib/cn";

interface Props {
  text: string;
  className?: string;
}

export function PlayAllButton({ text, className }: Props) {
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const handleRef = useRef<TtsHandle | null>(null);

  const handle = useMemo(() => speak(text), [text]);
  useEffect(() => {
    handleRef.current = handle;
    return () => handleRef.current?.stop();
  }, [handle]);

  if (!handle.isSupported) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        이 브라우저는 오디오 재생을 지원하지 않아요.
      </p>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {state !== "playing" ? (
        <button
          onClick={() => {
            handle.play();
            setState("playing");
          }}
          className="inline-flex items-center gap-2 rounded-full bg-brand text-brand-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          <Play size={16} /> {state === "paused" ? "이어듣기" : "3분 브리핑 듣기"}
        </button>
      ) : (
        <button
          onClick={() => {
            handle.pause();
            setState("paused");
          }}
          className="inline-flex items-center gap-2 rounded-full bg-muted text-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          <Pause size={16} /> 일시정지
        </button>
      )}
      {state !== "idle" && (
        <button
          onClick={() => {
            handle.stop();
            setState("idle");
          }}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-xs hover:bg-muted"
        >
          <Square size={12} /> 정지
        </button>
      )}
    </div>
  );
}
