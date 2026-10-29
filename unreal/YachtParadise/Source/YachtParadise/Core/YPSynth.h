// 레이스 사운드 합성기 (엔진 독립 C++17). 웹 버전 components/boat3d/raceAudio.ts의 설계를 옮겼다.
// 게임 스레드가 setFrame/trigger/splash로 상태를 넘기고, 오디오 스레드가 render로 샘플을 만든다.
// 언리얼에서는 UYPRaceSynthComponent(USynthComponent)가 render를 호출한다.
#pragma once

#include "YPCore.h"

#include <atomic>
#include <cstdint>

namespace yp {

class RaceSynth {
 public:
  explicit RaceSynth(double sampleRate = 48000);

  // ---- 게임 스레드에서 호출 (값만 원자적으로 넘긴다)
  void setFrame(double speedFrac, bool throttle, bool airborne, bool boosting, double rivalProx, double rivalDoppler,
                double rivalSpeedFrac);
  void trigger(const SfxEvent& e);
  void splash(double impact);
  void setMuted(bool muted) { muted_.store(muted); }

  // ---- 오디오 스레드에서 호출 (모노)
  void render(float* out, int numSamples);

  // 테스트용: 지금 엔진 점화 주파수 목표값 (Hz)
  double engineTargetHz() const;

 private:
  struct Biquad {
    double b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0, z1 = 0, z2 = 0;
    enum Kind : uint8_t { Lowpass, Highpass, Bandpass };
    void set(Kind kind, double freq, double q, double sr);
    double process(double x);
  };

  // 한 번 울리는 소리 (비프·쿵·잡음·혼)
  struct Voice {
    enum Type : uint8_t { Off, Tone, Noise, Horn } type = Off;
    double t = 0, delay = 0, dur = 0, peak = 0, attack = 0.005;
    double freq = 0, freqTo = 0, phase = 0, phase2 = 0;
    int wave = 0;  // 0 사인, 1 톱니
    Biquad filter;
    Biquad::Kind filterKind = Biquad::Lowpass;
    double from = 0, to = 0;
  };

  struct Command {
    uint8_t kind;  // 0 = 효과음, 1 = 착수
    SfxEvent event;
    double value;
  };

  void push(const Command& c);
  void start(const Command& c);
  void addTone(double freq, double dur, double peak, double delay = 0, double slideTo = 0, int wave = 0);
  void addNoise(Biquad::Kind kind, double from, double to, double dur, double peak, double delay = 0, double attack = 0.01);
  void addHorn();
  double noise();
  double voiceSample(Voice& v);

  double sr_;
  uint32_t rng_ = 0x12345678u;

  // 게임 스레드 → 오디오 스레드
  std::atomic<double> speed_{0}, rivalProx_{0}, rivalDoppler_{1}, rivalSpeed_{0};
  std::atomic<bool> throttle_{false}, airborne_{false}, boosting_{false}, muted_{false};
  static constexpr int kQueue = 64;
  Command queue_[kQueue];
  std::atomic<int> head_{0}, tail_{0};

  // 오디오 스레드 상태 (부드럽게 따라가는 값들)
  double fire_ = 32.5, engineGain_ = 0, cutoff_ = 400, rasp_ = 0, whine_ = 0;
  double hull_ = 0, hullCut_ = 400, spray_ = 0, wind_ = 0, rivalFire_ = 30, rivalGain_ = 0, rivalCut_ = 400;
  double ph1_ = 0, ph2_ = 0, phSub_ = 0, phWhine_ = 0, phR1_ = 0, phR2_ = 0;
  Biquad engineLp_, raspBp_, hullLp_, sprayHp_, windBp_, rivalLp_;
  int coefCountdown_ = 0;
  double comp_ = 1;  // 컴프레서 이득
  static constexpr int kVoices = 48;
  Voice voices_[kVoices];
};

// 오프라인 렌더 결과에서 주파수 성분 크기를 계산한다 (테스트·검증용)
double toneMagnitude(const float* data, int n, double freq, double sampleRate);

} // namespace yp
