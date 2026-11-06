// 배경음악 (public/boat/music, docs/boat-music-prompts.md). 화면마다 곡을 바꾸고 0.8초 동안 겹쳐 넘긴다.
// 브라우저는 사용자가 한 번 누르기 전엔 소리를 막으므로, 막히면 첫 클릭·키 입력 때 다시 튼다.
const DIR = "/boat/music/";
const MUTE_KEY = "yacht-paradise-muted"; // 레이스 효과음(raceAudio)과 같은 음소거 설정
const FADE = 0.8;

export type Track = "title" | "paradise" | "race" | "race-final" | "lose";

// 레이스곡은 엔진 소리에 묻히지 않을 만큼만 작게
const VOLUME: Record<Track, number> = { title: 0.5, paradise: 0.45, race: 0.3, "race-final": 0.34, lose: 0.55 };
const ONCE: Track[] = ["lose"];

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

class Music {
  private current: { track: Track; el: HTMLAudioElement } | null = null;
  private muted = false;
  private paused = false; // 광고 중
  private volume = 0.8; // 설정의 음악 음량 0..1
  private waiting = false;

  play(track: Track | null) {
    if (typeof window === "undefined" || this.current?.track === track) return;
    this.muted = readMuted();
    if (this.current) fade(this.current.el, 0, true);
    this.current = null;
    if (!track) return;
    const el = new Audio(DIR + track + ".mp3");
    el.loop = !ONCE.includes(track);
    el.volume = 0;
    this.current = { track, el };
    this.start();
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.apply();
  }

  setVolume(v: number) {
    this.volume = v;
    this.apply();
  }

  setPaused(p: boolean) {
    this.paused = p;
    this.apply();
  }

  private apply() {
    if (this.current) fade(this.current.el, this.target(), false);
  }

  private target() {
    return this.muted || this.paused || !this.current ? 0 : VOLUME[this.current.track] * this.volume;
  }

  private start() {
    const cur = this.current;
    if (!cur) return;
    cur.el.play().then(
      () => fade(cur.el, this.target(), false),
      () => this.retryOnGesture(),
    );
  }

  private retryOnGesture() {
    if (this.waiting) return;
    this.waiting = true;
    const go = () => {
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
      this.waiting = false;
      this.start();
    };
    window.addEventListener("pointerdown", go);
    window.addEventListener("keydown", go);
  }
}

function fade(el: HTMLAudioElement, to: number, stopAfter: boolean) {
  const from = el.volume;
  const t0 = performance.now();
  const step = () => {
    const k = Math.min((performance.now() - t0) / 1000 / FADE, 1);
    el.volume = from + (to - from) * k;
    if (k < 1) requestAnimationFrame(step);
    else if (stopAfter) el.pause();
  };
  requestAnimationFrame(step);
}

export const music = new Music();
