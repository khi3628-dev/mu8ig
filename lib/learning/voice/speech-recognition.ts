"use client";

/**
 * Thin wrapper around the browser's Web Speech API for Korean STT.
 * We deliberately keep the audio in the browser and only send the resulting
 * text to the server — no audio bytes ever leave the device.
 */

interface SREventLike {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: { isFinal: boolean; 0: { transcript: string } };
  };
}

interface SRErrorEventLike {
  error: string;
}

interface SRLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SREventLike) => void) | null;
  onerror: ((e: SRErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SRCtor = new () => SRLike;

function getCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRCtor;
    webkitSpeechRecognition?: SRCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getCtor() !== null;
}

export interface RecognizerHandle {
  stop: () => void;
  abort: () => void;
}

export function startRecognizer(opts: {
  lang?: string;
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (err: string) => void;
  onEnd: () => void;
}): RecognizerHandle | null {
  const Ctor = getCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = opts.lang ?? "ko-KR";
  rec.continuous = true;
  rec.interimResults = true;

  let finalBuf = "";

  rec.onresult = (event) => {
    let partial = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i];
      const t = r[0].transcript;
      if (r.isFinal) {
        finalBuf += t;
      } else {
        partial += t;
      }
    }
    if (partial) opts.onPartial(finalBuf + partial);
    else opts.onFinal(finalBuf);
  };

  rec.onerror = (e) => opts.onError(e.error);
  rec.onend = () => opts.onEnd();
  try {
    rec.start();
  } catch (err) {
    opts.onError((err as Error).message);
    return null;
  }

  return {
    stop: () => rec.stop(),
    abort: () => rec.abort(),
  };
}
