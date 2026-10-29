// 레이스 소리를 브라우저에서 직접 합성한다 (Web Audio, 음원 파일 없음).
// 엔진·물살은 계속 울리는 소리, 나머지는 이벤트마다 한 번 울리는 효과음이다.
import type { SfxEvent } from "@/lib/boat3d/sfx";

const MUTE_KEY = "yacht-paradise-muted";

export function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeMuted(m: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    // 저장소를 못 쓰면 이번 레이스 동안만 유지
  }
}

export class RaceAudio {
  private ctx: AudioContext;
  private master: GainNode;
  private noise: AudioBuffer;
  private engine: { a: OscillatorNode; b: OscillatorNode; filter: BiquadFilterNode; gain: GainNode };
  private water: { filter: BiquadFilterNode; gain: GainNode };

  constructor(muted: boolean) {
    this.ctx = new AudioContext();
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = muted ? 0 : 0.8;
    this.master.connect(ctx.destination);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // 엔진: 톱니파 + 한 옥타브 아래 사각파를 저역 통과 필터로 둥글게
    const a = ctx.createOscillator();
    const b = ctx.createOscillator();
    a.type = "sawtooth";
    b.type = "square";
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 500;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    a.connect(filter);
    b.connect(filter);
    filter.connect(gain).connect(this.master);
    a.start();
    b.start();
    this.engine = { a, b, filter, gain };

    // 물살: 반복 재생하는 잡음을 대역 통과 필터로
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = "bandpass";
    wf.Q.value = 0.7;
    wf.frequency.value = 800;
    const wg = ctx.createGain();
    wg.gain.value = 0;
    src.connect(wf).connect(wg).connect(this.master);
    src.start();
    this.water = { filter: wf, gain: wg };
  }

  // 브라우저가 소리를 막아 둔 상태면 사용자 입력 때 다시 켠다
  resume() {
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
  }

  setMuted(m: boolean) {
    this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.02);
  }

  // 매 프레임: 속도(0~1.3), 가속 중인지, 공중에 떴는지
  update(speedFrac: number, throttle: boolean, airborne: boolean) {
    const t = this.ctx.currentTime;
    const rev = airborne ? 1.3 : 1; // 물에서 떠오르면 엔진이 헛돈다
    const f = (48 + 115 * speedFrac + (throttle ? 18 : 0)) * rev;
    this.engine.a.frequency.setTargetAtTime(f, t, 0.08);
    this.engine.b.frequency.setTargetAtTime(f / 2, t, 0.08);
    this.engine.filter.frequency.setTargetAtTime(350 + 1500 * speedFrac, t, 0.1);
    this.engine.gain.gain.setTargetAtTime(0.03 + 0.045 * speedFrac + (throttle ? 0.025 : 0), t, 0.1);
    this.water.filter.frequency.setTargetAtTime(500 + 1500 * speedFrac, t, 0.1);
    this.water.gain.gain.setTargetAtTime(airborne ? 0.01 : 0.015 + 0.11 * Math.min(speedFrac, 1), t, 0.04);
  }

  // 착수할 때 "철썩"
  splash(impact: number) {
    this.burst(0.32, Math.min(0.45, 0.1 * impact), 2600, 350);
  }

  play(e: SfxEvent) {
    switch (e.type) {
      case "tick":
        this.tone(440, 0.15, "square", 0.12);
        break;
      case "go":
        this.tone(880, 0.45, "square", 0.14);
        break;
      case "boost":
        this.burst(0.6, 0.25, 600, 4000);
        this.tone(300, 0.5, "sawtooth", 0.06, 0, 900);
        break;
      case "catch":
        (e.legend ? [523, 659, 784, 1047, 1319] : [784, 1047]).forEach((f, i) =>
          this.tone(f, 0.25, "triangle", 0.15, i * 0.08),
        );
        break;
      case "miss":
        this.tone(220, 0.18, "triangle", 0.1, 0, 150);
        break;
      case "checkpoint":
        this.tone(1175, 0.12, "sine", 0.1);
        break;
      case "lap":
        [880, 1175].forEach((f, i) => this.tone(f, 0.18, "sine", 0.12, i * 0.1));
        break;
      case "finish":
        [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, i === 5 ? 0.6 : 0.16, "square", 0.1, i * 0.13));
        break;
      case "gear":
        this.tone(160, 0.05, "square", 0.12);
        this.tone(90, 0.06, "square", 0.1, 0.05);
        break;
    }
  }

  close() {
    this.ctx.close().catch(() => {});
  }

  private tone(freq: number, dur: number, type: OscillatorType, peak: number, delay = 0, slideTo?: number) {
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // 잡음 한 번: 필터 주파수를 from → to로 움직여 철썩/휘익 느낌을 낸다
  private burst(dur: number, peak: number, from: number, to: number) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + dur + 0.02);
  }
}
