export interface TtsHandle {
  play: () => void;
  pause: () => void;
  stop: () => void;
  isSupported: boolean;
}

export function speak(text: string, lang = "ko-KR"): TtsHandle {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return { play: () => {}, pause: () => {}, stop: () => {}, isSupported: false };
  }
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 1.05;
  return {
    play: () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    },
    pause: () => window.speechSynthesis.pause(),
    stop: () => window.speechSynthesis.cancel(),
    isSupported: true,
  };
}
