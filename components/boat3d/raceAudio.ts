// 레이스 사운드. 기본은 브라우저 합성(Web Audio)이고,
// public/boat/sfx/manifest.json에 적힌 녹음 파일이 있으면 그 소리로 바꿔 쓴다 (docs/boat-sound-prompts.md).
// 장난감 같은 사각파 비프 대신 엔진 회전수·배음·물살 층을 쌓아 실제 수상 레이스처럼 들리게 한다.
import type { SfxEvent } from "@/lib/boat3d/sfx";

const MUTE_KEY = "yacht-paradise-muted";
const SFX_DIR = "/boat/sfx/";
const MASTER = 0.9;

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

export interface AudioFrame {
  speedFrac: number; // 0~1.3
  throttle: boolean;
  airborne: boolean;
  boosting: boolean;
  rival: { dist: number; closing: number; speedFrac: number } | null; // 가장 가까운 라이벌
}

interface Loop {
  src: AudioBufferSourceNode;
  gain: GainNode;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export class RaceAudio {
  private ctx: AudioContext;
  private master: GainNode;
  private noise: AudioBuffer;
  private samples = new Map<string, AudioBuffer>();
  private wasAirborne = false;
  // 합성 엔진: 톱니파 2개 + 서브 + 연소음 + 제트 펌프 고음을 포화시켜 저역 필터로
  private eng: {
    saw: OscillatorNode; saw2: OscillatorNode; sub: OscillatorNode; filter: BiquadFilterNode; gain: GainNode;
    rasp: BiquadFilterNode; raspGain: GainNode; whine: OscillatorNode; whineGain: GainNode;
  };
  private hull: { filter: BiquadFilterNode; gain: GainNode };
  private spray: GainNode;
  private wind: { filter: BiquadFilterNode; gain: GainNode };
  private rival: { saw: OscillatorNode; saw2: OscillatorNode; filter: BiquadFilterNode; gain: GainNode };
  // 녹음 파일이 있을 때 쓰는 반복 소리
  private recEngine: { idle: Loop; high: Loop } | null = null;
  private recWater: Loop | null = null;
  private recWind: Loop | null = null;

  constructor(muted: boolean) {
    const ctx = (this.ctx = new AudioContext());
    // 전체를 컴프레서로 묶어 소리끼리 뭉치게 (레이싱 게임 믹스의 기본)
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 4;
    comp.attack.value = 0.005;
    comp.release.value = 0.2;
    this.master = ctx.createGain();
    this.master.gain.value = muted ? 0 : MASTER;
    this.master.connect(comp).connect(ctx.destination);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // 엔진
    const shaper = ctx.createWaveShaper();
    shaper.curve = softClip(6);
    const filter = this.biquad("lowpass", 400, 0.9);
    const gain = this.gainNode(0);
    const saw = this.osc("sawtooth", 32);
    const saw2 = this.osc("sawtooth", 64);
    saw2.detune.value = 7;
    const saw2g = this.gainNode(0.5);
    const sub = this.osc("square", 16);
    const subg = this.gainNode(0.35);
    saw.connect(shaper);
    saw2.connect(saw2g).connect(shaper);
    sub.connect(subg).connect(shaper);
    shaper.connect(filter).connect(gain).connect(this.master);
    const rasp = this.biquad("bandpass", 200, 2.5);
    const raspGain = this.gainNode(0);
    this.loopNoise().connect(rasp).connect(raspGain).connect(this.master);
    const whine = this.osc("sine", 400);
    const whineGain = this.gainNode(0);
    whine.connect(whineGain).connect(this.master);
    this.eng = { saw, saw2, sub, filter, gain, rasp, raspGain, whine, whineGain };

    // 물: 선체에 부딪히는 낮은 물살 + 높은 물보라 쉭 소리 + 바람
    const hullF = this.biquad("lowpass", 500, 0.7);
    const hullG = this.gainNode(0);
    this.loopNoise().connect(hullF).connect(hullG).connect(this.master);
    this.hull = { filter: hullF, gain: hullG };
    this.spray = this.gainNode(0);
    this.loopNoise().connect(this.biquad("highpass", 3500, 0.7)).connect(this.spray).connect(this.master);
    const windF = this.biquad("bandpass", 900, 0.5);
    const windG = this.gainNode(0);
    this.loopNoise().connect(windF).connect(windG).connect(this.master);
    this.wind = { filter: windF, gain: windG };

    // 가장 가까운 라이벌 엔진 (거리·접근 속도로 음량과 도플러)
    const rf = this.biquad("lowpass", 800, 0.8);
    const rg = this.gainNode(0);
    const rs = this.osc("sawtooth", 60);
    const rs2 = this.osc("sawtooth", 120);
    rs2.detune.value = -9;
    rs.connect(rf);
    rs2.connect(rf);
    rf.connect(rg).connect(this.master);
    this.rival = { saw: rs, saw2: rs2, filter: rf, gain: rg };

    this.loadRecordings().catch(() => {});
  }

  resume() {
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
  }

  setMuted(m: boolean) {
    this.master.gain.setTargetAtTime(m ? 0 : MASTER, this.ctx.currentTime, 0.02);
  }

  update(f: AudioFrame) {
    const t = this.ctx.currentTime;
    const s = clamp(f.speedFrac, 0, 1.3);
    const set = (p: AudioParam, v: number, tc = 0.08) => p.setTargetAtTime(v, t, tc);

    // 회전수: 공중에 뜨면 임펠러가 헛돌아 확 올라간다
    let rpm = 1300 + 6000 * Math.min(s, 1.15) + (f.throttle ? 500 : 0) + (f.boosting ? 600 : 0);
    if (f.airborne) rpm *= 1.22;
    const fire = (rpm / 60) * 1.5; // 3기통 4행정 점화 주파수
    if (f.airborne && !this.wasAirborne && s > 0.45) this.playRec("rev_air", 0.35);
    this.wasAirborne = f.airborne;

    const water = f.airborne ? 0.08 : 1;
    if (this.recEngine) {
      const mix = clamp((rpm - 1500) / 5500, 0, 1);
      set(this.recEngine.idle.gain.gain, (1 - mix) * 0.5);
      set(this.recEngine.high.gain.gain, mix * 0.6 + (f.throttle ? 0.05 : 0));
      set(this.recEngine.idle.src.playbackRate, clamp(rpm / 1300, 0.8, 2));
      set(this.recEngine.high.src.playbackRate, clamp(rpm / 7300, 0.6, 1.35));
    } else {
      set(this.eng.saw.frequency, fire);
      set(this.eng.saw2.frequency, fire * 2);
      set(this.eng.sub.frequency, fire / 2);
      set(this.eng.filter.frequency, 280 + 2400 * Math.min(s, 1.1) + (f.throttle ? 300 : 0), 0.1);
      set(this.eng.gain.gain, 0.05 + 0.07 * s + (f.throttle ? 0.03 : 0), 0.1);
      set(this.eng.rasp.frequency, fire * 4);
      set(this.eng.raspGain.gain, 0.012 + 0.045 * s);
      set(this.eng.whine.frequency, fire * 6.2);
      set(this.eng.whineGain.gain, 0.003 + 0.016 * s);
    }
    if (this.recWater) {
      set(this.recWater.gain.gain, (0.04 + 0.3 * Math.min(s, 1)) * water, 0.04);
      set(this.recWater.src.playbackRate, 0.8 + 0.4 * Math.min(s, 1));
    } else {
      set(this.hull.filter.frequency, 350 + 700 * s);
      set(this.hull.gain.gain, (0.03 + 0.16 * Math.min(s, 1)) * water, 0.04);
      set(this.spray.gain, (0.008 + 0.05 * Math.min(s, 1)) * water, 0.04);
    }
    const windLevel = 0.08 * Math.max(0, s - 0.35) ** 2 * 2;
    if (this.recWind) set(this.recWind.gain.gain, windLevel * 4);
    else {
      set(this.wind.gain.gain, windLevel);
      set(this.wind.filter.frequency, 700 + 900 * s);
    }

    // 라이벌: 가까울수록 크게, 다가오면 높게(도플러)
    const r = f.rival;
    const prox = r ? clamp(1 - r.dist / 70, 0, 1) : 0;
    const doppler = r ? clamp(1 / (1 - r.closing / 120), 0.75, 1.35) : 1;
    const rFire = ((1300 + 6000 * Math.min(r?.speedFrac ?? 0, 1.15)) / 60) * 1.5 * doppler;
    set(this.rival.saw.frequency, rFire);
    set(this.rival.saw2.frequency, rFire * 2);
    set(this.rival.filter.frequency, 400 + 1600 * prox);
    set(this.rival.gain.gain, 0.07 * prox * prox, 0.05);
  }

  // 착수: 낮은 쿵 + 물덩이 + 흩어지는 물보라
  splash(impact: number) {
    if (this.playRec(impact > 2.2 ? "splash_land" : "splash_small", clamp(impact / 3, 0.25, 1))) return;
    const k = clamp(impact / 3, 0.2, 1.2);
    this.thump(85, 40, 0.2, 0.28 * k);
    this.noiseHit("lowpass", 1800, 280, 0.35, 0.22 * k);
    this.noiseHit("highpass", 5000, 3000, 0.55, 0.06 * k);
  }

  play(e: SfxEvent) {
    switch (e.type) {
      case "tick":
        if (!this.playRec("countdown", 0.7)) this.beep(620, 0.22, 0.09);
        break;
      case "go":
        if (!this.playRec("go", 0.8)) this.beep(930, 0.55, 0.1);
        break;
      case "boost":
        if (!this.playRec("boost", 0.8)) this.noiseHit("bandpass", 400, 3200, 0.7, 0.18);
        break;
      case "catch":
        if (e.legend) {
          if (!this.playRec("fish_legend", 0.9)) {
            this.thump(70, 35, 0.35, 0.3);
            this.noiseHit("lowpass", 2200, 300, 0.8, 0.25);
            this.reel(0.12);
          }
        } else if (!this.playRec("fish_catch", 0.8)) {
          this.reel(0.08);
          this.noiseHit("lowpass", 2400, 500, 0.3, 0.1, 0.3);
        }
        break;
      case "miss":
        if (!this.playRec("fish_miss", 0.6)) {
          this.thump(480, 150, 0.12, 0.06);
          this.noiseHit("bandpass", 1500, 600, 0.15, 0.04);
        }
        break;
      case "checkpoint":
        if (!this.playRec("checkpoint", 0.5)) this.beep(1660, 0.07, 0.04);
        break;
      case "lap":
        if (!this.playRec("lap", 0.6)) {
          this.beep(990, 0.12, 0.05);
          this.beep(1480, 0.16, 0.05, 0.11);
        }
        break;
      case "finish":
        if (!this.playRec("finish_horn", 0.9)) this.horn();
        if (!this.playRec("crowd", 0.5, 0.4)) this.noiseHit("bandpass", 1200, 900, 3.2, 0.06, 0.3, 1.2);
        break;
      case "contact":
        // 선체끼리 부딪히는 둔탁한 쿵 + 플라스틱 선체 울림
        this.thump(130, 55, 0.18, 0.3);
        this.noiseHit("lowpass", 900, 200, 0.22, 0.16);
        this.noiseHit("bandpass", 1300, 900, 0.08, 0.08);
        break;
      case "gear":
        if (!this.playRec("gear_shift", 0.7)) {
          this.noiseHit("lowpass", 600, 200, 0.08, 0.12);
          this.thump(90, 55, 0.1, 0.12);
        }
        break;
    }
  }

  close() {
    this.ctx.close().catch(() => {});
  }

  // ---------------------------------------------------------------- 녹음 파일

  private async loadRecordings() {
    const res = await fetch(SFX_DIR + "manifest.json");
    if (!res.ok) return;
    const files = (await res.json()) as string[];
    await Promise.all(
      files.map(async (file) => {
        const r = await fetch(SFX_DIR + file);
        if (!r.ok) return;
        const buf = await this.ctx.decodeAudioData(await r.arrayBuffer());
        this.samples.set(file.replace(/\.[^.]+$/, ""), buf);
      }),
    );
    const idle = this.samples.get("engine_idle");
    const high = this.samples.get("engine_high");
    if (idle && high) {
      this.recEngine = { idle: this.loopRec(idle), high: this.loopRec(high) };
      this.eng.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.eng.raspGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.eng.whineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    const water = this.samples.get("water_rush");
    if (water) {
      this.recWater = this.loopRec(water);
      this.hull.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.spray.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    const wind = this.samples.get("wind");
    if (wind) {
      this.recWind = this.loopRec(wind);
      this.wind.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  private loopRec(buf: AudioBuffer): Loop {
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.gainNode(0);
    src.connect(gain).connect(this.master);
    src.start();
    return { src, gain };
  }

  private playRec(name: string, gain: number, delay = 0) {
    const buf = this.samples.get(name);
    if (!buf) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.gainNode(gain)).connect(this.master);
    src.start(this.ctx.currentTime + delay);
    return true;
  }

  // ---------------------------------------------------------------- 합성 도구

  private osc(type: OscillatorType, freq: number) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.start();
    return o;
  }

  private gainNode(v: number) {
    const g = this.ctx.createGain();
    g.gain.value = v;
    return g;
  }

  private biquad(type: BiquadFilterType, freq: number, q: number) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  private loopNoise() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.start(0, Math.random() * 2);
    return src;
  }

  private envelope(g: GainNode, t: number, peak: number, dur: number, attack = 0.005) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  // 깨끗한 사인 비프 (레이싱 대시보드 알림음 느낌, 사각파 대신)
  private beep(freq: number, dur: number, peak: number, delay = 0) {
    const t = this.ctx.currentTime + delay;
    for (const [mul, amp] of [[1, 1], [2, 0.18]] as const) {
      const o = this.ctx.createOscillator();
      o.frequency.value = freq * mul;
      const g = this.ctx.createGain();
      this.envelope(g, t, peak * amp, dur, 0.004);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
  }

  // 낮게 떨어지는 사인 (착수 쿵, 둔탁한 충격)
  private thump(from: number, to: number, dur: number, peak: number) {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain();
    this.envelope(g, t, peak, dur, 0.003);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // 잡음 한 번, 필터 주파수를 from → to로 움직인다
  private noiseHit(type: BiquadFilterType, from: number, to: number, dur: number, peak: number, delay = 0, attack = 0.01) {
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain();
    this.envelope(g, t, peak, dur, attack);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + dur + 0.02);
  }

  // 낚싯줄이 풀리는 릴 소리: 짧은 딸깍을 빠르게 반복
  private reel(peak: number) {
    for (let i = 0; i < 14; i++) this.noiseHit("bandpass", 3200, 2600, 0.025, peak * (1 - i / 18), i * 0.022, 0.002);
  }

  // 마린 에어혼: 낮게 어긋난 톱니파 두 개에 약한 떨림
  private horn() {
    const t = this.ctx.currentTime;
    const f = this.biquad("lowpass", 1400, 0.7);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.13, t + 0.06);
    g.gain.setValueAtTime(0.13, t + 1.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 5;
    const lfoGain = this.gainNode(2);
    lfo.connect(lfoGain);
    for (const hz of [155, 196]) {
      const o = this.ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = hz;
      lfoGain.connect(o.frequency);
      o.connect(f);
      o.start(t);
      o.stop(t + 1.85);
    }
    f.connect(g).connect(this.master);
    lfo.start(t);
    lfo.stop(t + 1.85);
  }
}

// 엔진 배음을 거칠게 만드는 소프트 클리핑 곡선
function softClip(k: number) {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}
