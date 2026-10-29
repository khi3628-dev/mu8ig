// 파도 높이, 통통 튀기, 효과음 이벤트 (웹 버전 lib/boat3d/{water,bounce,sfx}.ts를 옮김)
#include "YPCore.h"

namespace yp {

namespace fx_detail {
constexpr double kHopGravity = 14;  // 실제보다 조금 강하게 해서 경쾌하게 떨어지게 한다
constexpr double kLaunchMin = 0.9;  // 이보다 약한 반동은 수면에 붙어 있는다
constexpr double kLaunchMax = 3.2;  // 한 번에 튀는 힘의 상한
} // namespace fx_detail

double waveHeight(double x, double z, double t, double freq, double amp) {
  const double px = x * freq, pz = z * freq;
  const double h = std::sin(px * 0.12 + t * 1.1) * 0.5 + std::sin(pz * 0.09 + t * 0.9) * 0.5 +
                   std::sin((px + pz) * 0.2 + t * 1.7) * 0.25;
  return h * amp;
}

// 고속에서 자주 튀도록 큰 파도 위에 얹는 잔물결
double chop(double x, double z, double t) {
  return 0.07 * std::sin(x * 0.55 + t * 2.3) * std::sin(z * 0.47 - t * 1.9);
}

double stepHop(Hop& h, double surf, double dt, double speedFrac) {
  using namespace fx_detail;
  if (!h.prevSurf || dt <= 0) {
    h.prevSurf = surf;
    h.y = surf;
    return 0;
  }
  const double surfVel = (surf - *h.prevSurf) / dt;
  h.prevSurf = surf;
  if (!h.airborne) {
    // 수면을 타고 가다가, 수면이 솟는 속도에 주행 속도만큼 실린 반동이 충분히 세면 떠오른다
    const double rebound = surfVel * (1 + 2 * maxD(0, speedFrac));
    if (rebound < kLaunchMin) {
      h.y = surf;
      h.vy = 0;
      return 0;
    }
    h.airborne = true;
    h.y = surf;
    h.vy = minD(rebound, kLaunchMax);
  }
  h.vy -= kHopGravity * dt;
  h.y += h.vy * dt;
  if (h.y > surf) return 0;
  const double impact = maxD(0, -h.vy);
  h.y = surf;
  h.vy = 0;
  h.airborne = false;
  return impact;
}

SfxSnap sfxSnapshot(const RaceState& s) {
  const Racer& p = s.racers[0];
  SfxSnap snap;
  snap.count = s.time < 0 ? static_cast<int>(std::ceil(-s.time)) : 0;
  snap.boost = p.boost > 0;
  snap.caught = static_cast<int>(s.caught.size());
  if (s.lastCatch) snap.lastSpecies = s.lastCatch->species;
  snap.splits = static_cast<int>(s.recording.splits.size());
  snap.lap = p.lap;
  snap.finished = p.finishTime.has_value();
  snap.msg = s.message;
  snap.msgTimer = s.messageTimer;
  snap.contacts = s.contacts;
  return snap;
}

std::vector<SfxEvent> sfxEvents(const SfxSnap& prev, const SfxSnap& cur) {
  std::vector<SfxEvent> out;
  if (cur.count != prev.count) out.push_back({cur.count > 0 ? SfxType::Tick : SfxType::Go});
  if (cur.boost && !prev.boost) out.push_back({SfxType::Boost});
  if (cur.contacts > prev.contacts) out.push_back({SfxType::Contact});
  if (cur.caught > prev.caught) out.push_back({SfxType::Catch, cur.lastSpecies == kLegendSpecies});
  // 허탕 메시지가 새로 떴을 때 (타이머가 다시 채워짐)
  if (cur.msg == kMissMessage && cur.msgTimer > prev.msgTimer) out.push_back({SfxType::Miss});
  if (cur.splits > prev.splits) {
    if (cur.finished && !prev.finished) out.push_back({SfxType::Finish});
    else if (cur.lap > prev.lap) out.push_back({SfxType::Lap});
    else out.push_back({SfxType::Checkpoint});
  }
  return out;
}

} // namespace yp
