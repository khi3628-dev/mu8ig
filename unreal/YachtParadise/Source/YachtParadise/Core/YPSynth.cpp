// 레이스 사운드 합성기 구현. 수치는 웹 버전(components/boat3d/raceAudio.ts)과 같다.
#include "YPSynth.h"

namespace yp {

namespace synth_detail {

constexpr double kMaster = 0.9;
constexpr int kBlock = 32;  // 이 샘플 수마다 목표값·필터 계수를 갱신한다

double softClip(double x) {
  static const double norm = std::tanh(6.0);
  return std::tanh(6.0 * x) / norm;
}

double follow(double cur, double target, double dt, double tc) { return cur + (target - cur) * (1 - std::exp(-dt / tc)); }

} // namespace synth_detail

// ---------------------------------------------------------------- 필터 (RBJ 쿡북)

void RaceSynth::Biquad::set(Kind kind, double freq, double q, double sr) {
  const double f = clampD(freq, 10, sr * 0.45);
  const double w = 2 * kPi * f / sr;
  const double cw = std::cos(w), sw = std::sin(w);
  const double alpha = sw / (2 * q);
  double nb0 = 0, nb1 = 0, nb2 = 0;
  if (kind == Lowpass) {
    nb0 = (1 - cw) / 2;
    nb1 = 1 - cw;
    nb2 = (1 - cw) / 2;
  } else if (kind == Highpass) {
    nb0 = (1 + cw) / 2;
    nb1 = -(1 + cw);
    nb2 = (1 + cw) / 2;
  } else {
    nb0 = alpha;
    nb1 = 0;
    nb2 = -alpha;
  }
  const double a0 = 1 + alpha;
  b0 = nb0 / a0;
  b1 = nb1 / a0;
  b2 = nb2 / a0;
  a1 = (-2 * cw) / a0;
  a2 = (1 - alpha) / a0;
}

double RaceSynth::Biquad::process(double x) {
  const double y = b0 * x + z1;
  z1 = b1 * x - a1 * y + z2;
  z2 = b2 * x - a2 * y;
  return y;
}

// ---------------------------------------------------------------- 공개 함수

RaceSynth::RaceSynth(double sampleRate) : sr_(sampleRate) {
  engineLp_.set(Biquad::Lowpass, 400, 0.9, sr_);
  raspBp_.set(Biquad::Bandpass, 200, 2.5, sr_);
  hullLp_.set(Biquad::Lowpass, 500, 0.7, sr_);
  sprayHp_.set(Biquad::Highpass, 3500, 0.7, sr_);
  windBp_.set(Biquad::Bandpass, 900, 0.5, sr_);
  rivalLp_.set(Biquad::Lowpass, 800, 0.8, sr_);
}

void RaceSynth::setFrame(double speedFrac, bool throttle, bool airborne, bool boosting, double rivalProx,
                         double rivalDoppler, double rivalSpeedFrac) {
  speed_.store(speedFrac);
  throttle_.store(throttle);
  airborne_.store(airborne);
  boosting_.store(boosting);
  rivalProx_.store(rivalProx);
  rivalDoppler_.store(rivalDoppler);
  rivalSpeed_.store(rivalSpeedFrac);
}

void RaceSynth::trigger(const SfxEvent& e) { push(Command{0, e, 0}); }
void RaceSynth::splash(double impact) { push(Command{1, SfxEvent{SfxType::Tick}, impact}); }

// 게임 스레드 하나가 넣고 오디오 스레드 하나가 빼는 고정 크기 큐 (가득 차면 버린다)
void RaceSynth::push(const Command& c) {
  const int t = tail_.load(std::memory_order_relaxed);
  const int next = (t + 1) % kQueue;
  if (next == head_.load(std::memory_order_acquire)) return;
  queue_[t] = c;
  tail_.store(next, std::memory_order_release);
}

double RaceSynth::engineTargetHz() const {
  const double s = clampD(speed_.load(), 0, 1.3);
  double rpm = 1300 + 6000 * minD(s, 1.15) + (throttle_.load() ? 500 : 0) + (boosting_.load() ? 600 : 0);
  if (airborne_.load()) rpm *= 1.22;
  return (rpm / 60) * 1.5;  // 3기통 4행정 점화 주파수
}

void RaceSynth::render(float* out, int numSamples) {
  using namespace synth_detail;
  const double dt = 1.0 / sr_;
  for (int i = 0; i < numSamples; i++) {
    if (coefCountdown_-- <= 0) {
      coefCountdown_ = kBlock - 1;
      const double bdt = kBlock * dt;
      // 대기 중인 효과음 시작
      for (int h = head_.load(std::memory_order_relaxed); h != tail_.load(std::memory_order_acquire); h = (h + 1) % kQueue) {
        start(queue_[h]);
        head_.store((h + 1) % kQueue, std::memory_order_release);
      }
      const double s = clampD(speed_.load(), 0, 1.3);
      const bool thr = throttle_.load(), air = airborne_.load();
      const double water = air ? 0.08 : 1;
      fire_ = follow(fire_, engineTargetHz(), bdt, 0.08);
      cutoff_ = follow(cutoff_, 280 + 2400 * minD(s, 1.1) + (thr ? 300 : 0), bdt, 0.1);
      engineGain_ = follow(engineGain_, 0.05 + 0.07 * s + (thr ? 0.03 : 0), bdt, 0.1);
      rasp_ = follow(rasp_, 0.012 + 0.045 * s, bdt, 0.08);
      whine_ = follow(whine_, 0.003 + 0.016 * s, bdt, 0.08);
      hullCut_ = follow(hullCut_, 350 + 700 * s, bdt, 0.08);
      hull_ = follow(hull_, (0.03 + 0.16 * minD(s, 1)) * water, bdt, 0.04);
      spray_ = follow(spray_, (0.008 + 0.05 * minD(s, 1)) * water, bdt, 0.04);
      const double over = maxD(0, s - 0.35);
      wind_ = follow(wind_, 0.08 * over * over * 2, bdt, 0.08);
      const double prox = clampD(rivalProx_.load(), 0, 1);
      const double rFire = ((1300 + 6000 * minD(rivalSpeed_.load(), 1.15)) / 60) * 1.5 * rivalDoppler_.load();
      rivalFire_ = follow(rivalFire_, rFire, bdt, 0.08);
      rivalGain_ = follow(rivalGain_, 0.07 * prox * prox, bdt, 0.05);
      rivalCut_ = follow(rivalCut_, 400 + 1600 * prox, bdt, 0.08);
      engineLp_.set(Biquad::Lowpass, cutoff_, 0.9, sr_);
      raspBp_.set(Biquad::Bandpass, fire_ * 4, 2.5, sr_);
      hullLp_.set(Biquad::Lowpass, hullCut_, 0.7, sr_);
      windBp_.set(Biquad::Bandpass, 700 + 900 * s, 0.5, sr_);
      rivalLp_.set(Biquad::Lowpass, rivalCut_, 0.8, sr_);
    }

    // 엔진: 톱니파 + 한 옥타브 위(살짝 어긋남) + 서브 사각파 → 포화 → 저역 필터
    ph1_ += fire_ * dt;
    ph2_ += fire_ * 2 * 1.00405 * dt;  // +7센트
    phSub_ += fire_ * 0.5 * dt;
    phWhine_ += fire_ * 6.2 * dt;
    ph1_ -= std::floor(ph1_);
    ph2_ -= std::floor(ph2_);
    phSub_ -= std::floor(phSub_);
    phWhine_ -= std::floor(phWhine_);
    const double raw = (2 * ph1_ - 1) + 0.5 * (2 * ph2_ - 1) + 0.35 * (phSub_ < 0.5 ? 1 : -1);
    double mix = engineLp_.process(softClip(raw * 0.5)) * engineGain_;
    mix += raspBp_.process(noise()) * rasp_;
    mix += std::sin(2 * kPi * phWhine_) * whine_;
    // 물: 선체 물살 + 물보라 + 바람
    mix += hullLp_.process(noise()) * hull_;
    mix += sprayHp_.process(noise()) * spray_;
    mix += windBp_.process(noise()) * wind_;
    // 가장 가까운 라이벌 엔진
    phR1_ += rivalFire_ * dt;
    phR2_ += rivalFire_ * 2 * 0.99481 * dt;  // -9센트
    phR1_ -= std::floor(phR1_);
    phR2_ -= std::floor(phR2_);
    mix += rivalLp_.process((2 * phR1_ - 1) + (2 * phR2_ - 1)) * rivalGain_;
    // 효과음
    for (Voice& v : voices_) {
      if (v.type != Voice::Off) mix += voiceSample(v);
    }
    mix *= kMaster;
    // 컴프레서: -20dB 위를 4:1로 눌러 소리끼리 뭉치게
    const double level = std::abs(mix), thr = 0.1;
    const double target = level > thr ? (thr + (level - thr) / 4) / level : 1;
    comp_ = target < comp_ ? follow(comp_, target, dt, 0.005) : follow(comp_, target, dt, 0.2);
    double y = mix * comp_;
    y = std::tanh(y);  // 마지막 안전장치
    out[i] = muted_.load(std::memory_order_relaxed) ? 0.0f : static_cast<float>(y);
  }
}

// ---------------------------------------------------------------- 효과음

void RaceSynth::start(const Command& c) {
  if (c.kind == 1) {
    // 착수: 낮은 쿵 + 물덩이 + 흩어지는 물보라
    const double k = clampD(c.value / 3, 0.2, 1.2);
    addTone(85, 0.2, 0.28 * k, 0, 40);
    addNoise(Biquad::Lowpass, 1800, 280, 0.35, 0.22 * k);
    addNoise(Biquad::Highpass, 5000, 3000, 0.55, 0.06 * k);
    return;
  }
  auto beep = [this](double f, double dur, double peak, double delay) {
    addTone(f, dur, peak, delay);
    addTone(f * 2, dur, peak * 0.18, delay);
  };
  auto reel = [this](double peak) {
    for (int i = 0; i < 14; i++) addNoise(Biquad::Bandpass, 3200, 2600, 0.025, peak * (1 - i / 18.0), i * 0.022, 0.002);
  };
  switch (c.event.type) {
    case SfxType::Tick: beep(620, 0.22, 0.09, 0); break;
    case SfxType::Go: beep(930, 0.55, 0.1, 0); break;
    case SfxType::Boost: addNoise(Biquad::Bandpass, 400, 3200, 0.7, 0.18); break;
    case SfxType::Catch:
      if (c.event.legend) {
        addTone(70, 0.35, 0.3, 0, 35);
        addNoise(Biquad::Lowpass, 2200, 300, 0.8, 0.25);
        reel(0.12);
      } else {
        reel(0.08);
        addNoise(Biquad::Lowpass, 2400, 500, 0.3, 0.1, 0.3);
      }
      break;
    case SfxType::Miss:
      addTone(480, 0.12, 0.06, 0, 150);
      addNoise(Biquad::Bandpass, 1500, 600, 0.15, 0.04);
      break;
    case SfxType::Checkpoint: beep(1660, 0.07, 0.04, 0); break;
    case SfxType::Lap:
      beep(990, 0.12, 0.05, 0);
      beep(1480, 0.16, 0.05, 0.11);
      break;
    case SfxType::Finish:
      addHorn();
      addNoise(Biquad::Bandpass, 1200, 900, 3.2, 0.06, 0.3, 1.2);
      break;
    case SfxType::Gear:
      addNoise(Biquad::Lowpass, 600, 200, 0.08, 0.12);
      addTone(90, 0.1, 0.12, 0, 55);
      break;
    case SfxType::Contact:
      addTone(130, 0.18, 0.3, 0, 55);
      addNoise(Biquad::Lowpass, 900, 200, 0.22, 0.16);
      addNoise(Biquad::Bandpass, 1300, 900, 0.08, 0.08);
      break;
  }
}

void RaceSynth::addTone(double freq, double dur, double peak, double delay, double slideTo, int wave) {
  for (Voice& v : voices_) {
    if (v.type != Voice::Off) continue;
    v = Voice{};
    v.type = Voice::Tone;
    v.freq = freq;
    v.freqTo = slideTo > 0 ? slideTo : freq;
    v.dur = dur;
    v.peak = peak;
    v.delay = delay;
    v.attack = 0.004;
    v.wave = wave;
    return;
  }
}

void RaceSynth::addNoise(Biquad::Kind kind, double from, double to, double dur, double peak, double delay, double attack) {
  for (Voice& v : voices_) {
    if (v.type != Voice::Off) continue;
    v = Voice{};
    v.type = Voice::Noise;
    v.filterKind = kind;
    v.from = from;
    v.to = to;
    v.dur = dur;
    v.peak = peak;
    v.delay = delay;
    v.attack = attack;
    v.filter.set(kind, from, kind == Biquad::Bandpass ? 1.0 : 0.7, sr_);
    return;
  }
}

// 마린 에어혼: 낮게 어긋난 톱니파 두 개에 약한 떨림
void RaceSynth::addHorn() {
  for (Voice& v : voices_) {
    if (v.type != Voice::Off) continue;
    v = Voice{};
    v.type = Voice::Horn;
    v.dur = 1.8;
    v.peak = 0.13;
    v.attack = 0.06;
    v.filter.set(Biquad::Lowpass, 1400, 0.7, sr_);
    return;
  }
}

double RaceSynth::noise() {
  // xorshift32
  rng_ ^= rng_ << 13;
  rng_ ^= rng_ >> 17;
  rng_ ^= rng_ << 5;
  return (rng_ / 4294967295.0) * 2 - 1;
}

double RaceSynth::voiceSample(Voice& v) {
  const double dt = 1.0 / sr_;
  if (v.delay > 0) {
    v.delay -= dt;
    return 0;
  }
  const double t = v.t;
  v.t += dt;
  if (t >= v.dur) {
    v.type = Voice::Off;
    return 0;
  }
  // 엔벨로프: 짧게 올라갔다가 지수적으로 -80dB까지 줄어든다 (혼은 1.3초 유지)
  double env;
  if (t < v.attack) env = v.peak * (t / v.attack);
  else if (v.type == Voice::Horn && t < 1.3) env = v.peak;
  else {
    const double start = v.type == Voice::Horn ? 1.3 : v.attack;
    env = v.peak * std::exp(std::log(0.0001 / maxD(v.peak, 0.0002)) * (t - start) / maxD(v.dur - start, 1e-3));
  }
  const double k = t / v.dur;
  switch (v.type) {
    case Voice::Tone: {
      const double f = v.freq * std::pow(v.freqTo / v.freq, k);
      v.phase += f * dt;
      v.phase -= std::floor(v.phase);
      const double s = v.wave == 1 ? 2 * v.phase - 1 : std::sin(2 * kPi * v.phase);
      return s * env;
    }
    case Voice::Noise: {
      if ((static_cast<int>(t * sr_) & 15) == 0) {
        v.filter.set(v.filterKind, v.from * std::pow(v.to / v.from, k), v.filterKind == Biquad::Bandpass ? 1.0 : 0.7, sr_);
      }
      return v.filter.process(noise()) * env;
    }
    case Voice::Horn: {
      const double vib = 2 * std::sin(2 * kPi * 5 * t);
      v.phase += (155 + vib) * dt;
      v.phase2 += (196 + vib) * dt;
      v.phase -= std::floor(v.phase);
      v.phase2 -= std::floor(v.phase2);
      return v.filter.process((2 * v.phase - 1) + (2 * v.phase2 - 1)) * env;
    }
    case Voice::Off:
      break;
  }
  return 0;
}

double toneMagnitude(const float* data, int n, double freq, double sampleRate) {
  double re = 0, im = 0;
  for (int i = 0; i < n; i++) {
    const double a = 2 * kPi * freq * i / sampleRate;
    re += data[i] * std::cos(a);
    im += data[i] * std::sin(a);
  }
  return std::hypot(re, im) / n;
}

} // namespace yp
