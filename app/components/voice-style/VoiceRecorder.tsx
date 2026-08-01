"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, RefreshCw, KeyRound } from "lucide-react";
import {
  isSpeechRecognitionSupported,
  startRecognizer,
  type RecognizerHandle,
} from "@/lib/learning/voice/speech-recognition";
import { Button } from "@/app/components/shared/Button";
import { useT } from "@/app/components/shared/T";
import { cn } from "@/lib/learning/cn";

interface Props {
  onTranscript: (text: string) => void;
}

type State = "idle" | "recording" | "denied" | "unsupported";

export function VoiceRecorder({ onTranscript }: Props) {
  const t = useT();
  const [state, setState] = useState<State>("idle");
  const [live, setLive] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [manualText, setManualText] = useState("");
  const handleRef = useRef<RecognizerHandle | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isSpeechRecognitionSupported()) setState("unsupported");
  }, []);

  useEffect(() => {
    return () => {
      handleRef.current?.abort();
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  const start = () => {
    setLive("");
    setSeconds(0);
    const h = startRecognizer({
      lang: "ko-KR",
      onPartial: (text) => setLive(text),
      onFinal: (text) => setLive(text),
      onError: (err) => {
        if (err === "not-allowed" || err === "service-not-allowed") {
          setState("denied");
        } else {
          setState("idle");
        }
        handleRef.current = null;
      },
      onEnd: () => {
        handleRef.current = null;
        setState("idle");
        if (tickRef.current) {
          window.clearInterval(tickRef.current);
          tickRef.current = null;
        }
        setLive((cur) => {
          if (cur.trim()) onTranscript(cur.trim());
          return cur;
        });
      },
    });
    if (!h) {
      setState("unsupported");
      return;
    }
    handleRef.current = h;
    setState("recording");
    const startAt = Date.now();
    tickRef.current = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - startAt) / 1000));
    }, 250) as unknown as number;
  };

  const stop = () => handleRef.current?.stop();
  const submitManual = () => {
    const s = manualText.trim();
    if (s) {
      onTranscript(s);
      setManualText("");
    }
  };

  if (state === "unsupported" || state === "denied") {
    return (
      <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
        <div className="text-sm text-[var(--muted-foreground)]">
          {state === "denied" ? t("vs.micDenied") : t("vs.notSupported")}
        </div>
        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder={t("vs.textFallback")}
          className="w-full min-h-24 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm"
        />
        <Button
          onClick={submitManual}
          disabled={!manualText.trim()}
          fullWidth
        >
          <KeyRound className="w-4 h-4" />
          {t("common.save")}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          {state === "recording" ? t("vs.recording") : t("vs.record")}
        </div>
        <div className="text-xs tabular-nums text-[var(--muted-foreground)]">
          {seconds}s
        </div>
      </div>
      <div
        className={cn(
          "min-h-24 rounded-xl border p-3 text-sm whitespace-pre-wrap",
          state === "recording"
            ? "border-[var(--brand)] bg-[var(--brand-muted)]"
            : "border-[var(--border)] bg-[var(--muted)]",
          !live && "text-[var(--muted-foreground)] italic",
        )}
      >
        {live || (state === "recording"
          ? "듣고 있어요…"
          : "녹음 시작을 눌러 20~30초 정도 한국어로 말해보세요.")}
      </div>
      {state === "recording" ? (
        <Button onClick={stop} fullWidth variant="danger">
          <Square className="w-4 h-4" />
          {t("vs.stop")}
        </Button>
      ) : (
        <Button onClick={start} fullWidth>
          {live ? (
            <>
              <RefreshCw className="w-4 h-4" />
              {t("vs.rerecord")}
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              {t("vs.record")}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
