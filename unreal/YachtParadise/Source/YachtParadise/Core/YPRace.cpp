// 레이스 규칙 (웹 버전 lib/boat/race.ts, lib/boat/ghost.ts를 옮김)
#include "YPCore.h"

#include <algorithm>
#include <cstdio>

namespace yp {

namespace race_detail {

constexpr double kOffTrackSpeed = 15;
constexpr double kBoostMult = 1.4;
constexpr double kAccel = 14;
constexpr double kBrake = 25;
constexpr double kDrag = 6;
constexpr double kAiTurnRate = 2.2;
constexpr double kBoostTime = 1.5;
constexpr double kBoostRadius = 5;
constexpr double kCatchSlowTime = 1;
constexpr double kReverseSpeed = 7;  // 후진 최고 속도 (약 25km/h)
constexpr double kReverseAccel = 6;
constexpr double kHullRadius = 1.6;  // 제트스키끼리 부딪히는 반경 (m)
constexpr double kContactSlow = 0.95;
constexpr double kPackGain = 0.06;   // AI 접전 보정: 체크포인트 하나 차이당 속도 ±6%
constexpr double kPackMax = 0.12;

struct AiProfile {
  const char* name;
  const char* en;
  uint32_t color;
  double topSpeed;
};

constexpr std::array<AiProfile, 5> kAiProfiles = {{
    {"마르코", "MARCO", 0xef4444, 27},
    {"소피아", "SOFIA", 0xf97316, 26},
    {"레오", "LEO", 0x22c55e, 25},
    {"아이라", "AIRA", 0xa855f7, 24},
    {"카이", "KAI", 0x0ea5e9, 23},
}};

void say(RaceState& state, const std::string& msg) {
  state.message = msg;
  state.messageTimer = 2;
}

double maxSpeedFor(const RaceState& state, const Racer& r, double base) {
  double max = r.boost > 0 ? base * kBoostMult : base;
  if (distanceToCourse(state.course, r.x, r.y) > kTrackHalf) max = minD(max, kOffTrackSpeed);
  if (r.slow > 0) max *= 0.6;
  return max;
}

void approachSpeed(Racer& r, double target, double dt) {
  if (r.speed < target) r.speed = minD(target, r.speed + kAccel * dt);
  else r.speed = maxD(target, r.speed - kBrake * dt);
}

double towardZero(double v, double rate, double dt) {
  return v > 0 ? maxD(0, v - rate * dt) : minD(0, v + rate * dt);
}

void steerPlayer(const RaceState& state, Racer& r, const RaceInput& input, double dt) {
  const double grip = minD(1, std::abs(r.speed) / 8) + 0.3;
  // 후진 중에는 실제 배처럼 조향이 반대로 먹는다
  r.heading += input.steer * state.stats.turnRate * grip * dt * (r.speed < 0 ? -1 : 1);
  const double max = maxSpeedFor(state, r, r.topSpeed);
  if (input.throttle > 0 && input.reverse) {
    // 앞으로 달리던 중이면 먼저 멈춘 뒤 뒤로 간다
    r.speed = r.speed > 0 ? maxD(0, r.speed - kBrake * dt) : maxD(-kReverseSpeed, r.speed - kReverseAccel * dt);
  } else if (input.throttle > 0) {
    approachSpeed(r, max, dt);
  } else if (input.throttle < 0) {
    r.speed = towardZero(r.speed, kBrake, dt);
  } else {
    r.speed = towardZero(r.speed, kDrag, dt);
  }
  if (r.speed > max) r.speed = maxD(max, r.speed - kBrake * dt);
}

// 제트스키끼리 겹치면 서로 밀어내고, 부딪히는 순간에만 속도를 잃는다
void collide(RaceState& state) {
  auto& rs = state.racers;
  for (int i = 0; i < static_cast<int>(rs.size()); i++) {
    for (int j = i + 1; j < static_cast<int>(rs.size()); j++) {
      Racer& a = rs[i];
      Racer& b = rs[j];
      const double dx = b.x - a.x, dy = b.y - a.y;
      const double d = std::hypot(dx, dy);
      const auto key = std::make_pair(i, j);
      if (d >= kHullRadius * 2) {
        state.touching.erase(key);
        continue;
      }
      const double nx = d > 1e-6 ? dx / d : 1, ny = d > 1e-6 ? dy / d : 0;
      const double push = (kHullRadius * 2 - d) / 2;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
      if (state.touching.count(key)) continue; // 이미 맞닿아 있으면 밀어내기만
      state.touching.insert(key);
      a.speed *= kContactSlow;
      b.speed *= kContactSlow;
      if (a.isPlayer || b.isPlayer) state.contacts += 1;
    }
  }
}

void steerAI(const RaceState& state, Racer& r, double dt, double playerProgress) {
  const int n = static_cast<int>(state.course.size());
  const Vec2 target = state.course[r.next];
  const Vec2 after = state.course[(r.next + 1) % n];
  // 진행 방향의 수직 방향으로 laneOffset 만큼 비켜 달린다
  const double dirX = after.x - target.x, dirY = after.y - target.y;
  double len = std::hypot(dirX, dirY);
  if (len == 0) len = 1;
  const double tx = target.x - (dirY / len) * r.laneOffset;
  const double ty = target.y + (dirX / len) * r.laneOffset;
  double desired = std::atan2(ty - r.y, tx - r.x);
  // 바로 앞에 다른 제트스키가 있으면 옆으로 비켜 추월한다
  const double hx = std::cos(r.heading), hy = std::sin(r.heading);
  for (const Racer& o : state.racers) {
    if (&o == &r) continue;
    const double ox = o.x - r.x, oy = o.y - r.y;
    const double ahead = ox * hx + oy * hy;
    const double side = -ox * hy + oy * hx; // 양수 = 오른쪽
    if (ahead > 0 && ahead < 12 && std::abs(side) < 3.5) desired += (side >= 0 ? -0.5 : 0.5) * (1 - ahead / 12);
  }
  double diff = desired - r.heading;
  diff = std::atan2(std::sin(diff), std::cos(diff));
  r.heading += maxD(-1, minD(1, diff * 2)) * kAiTurnRate * dt;
  // 접전 유지: 플레이어보다 뒤처지면 조금 빨라지고, 많이 앞서면 조금 늦춘다
  const double gap = playerProgress - progress(state, r);
  const double pace = 1 + maxD(-kPackMax, minD(kPackMax, gap * kPackGain));
  approachSpeed(r, maxSpeedFor(state, r, r.topSpeed * pace), dt);
}

void checkpoints(RaceState& state, Racer& r) {
  if (r.finishTime) return;
  const Vec2 cp = state.course[r.next];
  if (std::hypot(cp.x - r.x, cp.y - r.y) > kCheckpointRadius) return;
  if (r.isPlayer) recordSplit(state.recording, state.time);
  if (r.next == 0) {
    r.lap += 1;
    if (r.lap >= kLaps) {
      r.finishTime = state.time;
      if (r.isPlayer) say(state, "FINISH");
      return;
    }
    if (r.isPlayer) say(state, r.lap == kLaps - 1 ? std::string("FINAL LAP") : "LAP " + std::to_string(r.lap + 1));
  }
  r.next = (r.next + 1) % static_cast<int>(state.course.size());
}

int pickSpecies(const RandFn& rand) {
  int total = 0;
  for (const auto& f : kFish) total += f.weight;
  double roll = rand() * total;
  for (int i = 0; i < static_cast<int>(kFish.size()); i++) {
    roll -= kFish[i].weight;
    if (roll < 0) return i;
  }
  return 0;
}

void updateFish(RaceState& state, double dt, const RandFn& rand) {
  for (auto& f : state.fish) f.life -= dt;
  state.fish.erase(std::remove_if(state.fish.begin(), state.fish.end(), [](const JumpingFish& f) { return f.life <= 0; }),
                   state.fish.end());
  state.fishTimer -= dt;
  if (state.fishTimer > 0) return;
  state.fishTimer = 1.5 + rand() * 1.5;
  // 플레이어 앞쪽 구간 코스 주변에 물고기를 띄운다
  const int n = static_cast<int>(state.course.size());
  const Racer& player = state.racers[0];
  const Vec2 a = state.course[player.next];
  const Vec2 b = state.course[(player.next + 1) % n];
  const double t = rand();
  const double side = (rand() - 0.5) * 2 * kTrackHalf;
  double len = std::hypot(b.x - a.x, b.y - a.y);
  if (len == 0) len = 1;
  JumpingFish f;
  f.id = state.nextFishId++;
  f.species = pickSpecies(rand);
  f.x = a.x + (b.x - a.x) * t - ((b.y - a.y) / len) * side;
  f.y = a.y + (b.y - a.y) * t + ((b.x - a.x) / len) * side;
  f.life = 2.5;
  f.maxLife = 2.5;
  state.fish.push_back(f);
}

} // namespace race_detail

std::vector<Vec2> createCourse() {
  // 타원에 굴곡을 줘서 단조롭지 않게 한다
  constexpr std::array<double, 10> wobble = {1, 0.85, 1.1, 0.9, 1.05, 0.8, 1.1, 0.95, 1.05, 0.9};
  std::vector<Vec2> out;
  for (int i = 0; i < static_cast<int>(wobble.size()); i++) {
    const double a = (static_cast<double>(i) / wobble.size()) * kPi * 2;
    out.push_back({std::cos(a) * 200 * wobble[i], std::sin(a) * 120 * wobble[i]});
  }
  return out;
}

RaceState createRace(const RandFn& rand, const PlayerStats& stats, const RacePerks& perks, std::optional<GhostRun> ghost) {
  RaceState s;
  s.stats = stats;
  s.perks = perks;
  s.ghost = std::move(ghost);
  s.course = createCourse();
  const Vec2 start = s.course[0];
  const Vec2 second = s.course[1];
  const double heading = std::atan2(second.y - start.y, second.x - start.x);
  // 출발선 뒤쪽으로 2열 그리드 배치
  const Vec2 back{-std::cos(heading), -std::sin(heading)};
  const Vec2 side{-std::sin(heading), std::cos(heading)};
  for (int i = 0; i < 1 + static_cast<int>(race_detail::kAiProfiles.size()); i++) {
    Racer r;
    if (i == 0) {
      r.name = "나";
      r.label = "YOU";
      r.color = 0xffffff;
      r.topSpeed = stats.topSpeed;
    } else {
      const auto& p = race_detail::kAiProfiles[i - 1];
      r.name = p.name;
      r.label = p.en;
      r.color = p.color;
      r.topSpeed = p.topSpeed;
    }
    const int row = i / 2;
    const int col = i % 2 == 0 ? -1 : 1;
    r.isPlayer = i == 0;
    r.x = start.x + back.x * (8 + row * 10) + side.x * col * 6;
    r.y = start.y + back.y * (8 + row * 10) + side.y * col * 6;
    r.heading = heading;
    r.speed = i == 0 ? perks.startSpeed : 0; // 카운트다운 중엔 움직이지 않다가 GO와 동시에 이 속도로 출발
    r.laneOffset = i == 0 ? 0 : (rand() - 0.5) * 16;
    s.racers.push_back(r);
  }
  const int n = static_cast<int>(s.course.size());
  for (int j = 0, i = 1; i < n; i += 2, j++) {
    const Vec2 p = s.course[i];
    const Vec2 q = s.course[(j * 2 + 2) % n];
    s.boostPads.push_back({(p.x + q.x) / 2, (p.y + q.y) / 2});
  }
  return s;
}

double distanceToCourse(const std::vector<Vec2>& course, double x, double y) {
  double best = 1e300;
  const int n = static_cast<int>(course.size());
  for (int i = 0; i < n; i++) {
    const Vec2 a = course[i];
    const Vec2 b = course[(i + 1) % n];
    const double dx = b.x - a.x, dy = b.y - a.y;
    const double t = maxD(0, minD(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
    best = minD(best, std::hypot(x - (a.x + dx * t), y - (a.y + dy * t)));
  }
  return best;
}

std::vector<Vec2> boundaryPoints(const std::vector<Vec2>& course, double half, double gap) {
  std::vector<Vec2> candidates;
  const int n = static_cast<int>(course.size());
  for (int i = 0; i < n; i++) {
    const Vec2 a = course[i];
    const Vec2 b = course[(i + 1) % n];
    const double dx = b.x - a.x, dy = b.y - a.y;
    const double len = std::hypot(dx, dy);
    const double nx = -dy / len, ny = dx / len;
    for (double s = 0; s < len; s += 6) {
      for (const double side : {1.0, -1.0}) {
        candidates.push_back({a.x + (dx / len) * s + nx * half * side, a.y + (dy / len) * s + ny * half * side});
      }
    }
    for (int k = 0; k < 24; k++) {
      const double ang = (k / 24.0) * kPi * 2;
      candidates.push_back({a.x + std::cos(ang) * half, a.y + std::sin(ang) * half});
    }
  }
  std::vector<Vec2> out;
  for (const Vec2& p : candidates) {
    if (distanceToCourse(course, p.x, p.y) < half - 0.5) continue; // 다른 구간과 겹치는 안쪽은 버린다
    bool farEnough = true;
    for (const Vec2& q : out) farEnough = farEnough && std::hypot(q.x - p.x, q.y - p.y) >= gap;
    if (farEnough) out.push_back(p);
  }
  return out;
}

// 순위 계산용 진행도: 통과한 체크포인트 수 + 다음 체크포인트까지의 진척률
double progress(const RaceState& state, const Racer& r) {
  const int n = static_cast<int>(state.course.size());
  const int passed = r.lap * n + ((r.next - 1 + n) % n);
  const Vec2 prev = state.course[(r.next - 1 + n) % n];
  const Vec2 next = state.course[r.next];
  const double seg = std::hypot(next.x - prev.x, next.y - prev.y);
  const double frac = 1 - minD(1, std::hypot(next.x - r.x, next.y - r.y) / seg);
  return passed + frac;
}

std::vector<int> standings(const RaceState& state) {
  std::vector<int> order(state.racers.size());
  for (int i = 0; i < static_cast<int>(order.size()); i++) order[i] = i;
  std::stable_sort(order.begin(), order.end(), [&](int ia, int ib) {
    const Racer& a = state.racers[ia];
    const Racer& b = state.racers[ib];
    if (a.finishTime && b.finishTime) return *a.finishTime < *b.finishTime;
    if (a.finishTime) return true;
    if (b.finishTime) return false;
    return progress(state, b) < progress(state, a);
  });
  return order;
}

void updateRace(RaceState& state, double dt, const RaceInput& input, const RandFn& rand) {
  using namespace race_detail;
  if (state.done) return;
  state.time += dt;
  state.messageTimer = maxD(0, state.messageTimer - dt);
  if (state.time < 0) return;

  const double playerProgress = progress(state, state.racers[0]);
  for (Racer& r : state.racers) {
    if (r.finishTime) {
      r.speed = maxD(0, r.speed - kDrag * dt); // 완주 후엔 서서히 멈춘다
    } else if (r.isPlayer) {
      steerPlayer(state, r, input, dt);
    } else {
      steerAI(state, r, dt, playerProgress);
    }
    r.x += std::cos(r.heading) * r.speed * dt;
    r.y += std::sin(r.heading) * r.speed * dt;
    r.boost = maxD(0, r.boost - dt);
    r.slow = maxD(0, r.slow - dt);
    for (const Vec2& pad : state.boostPads) {
      if (std::hypot(pad.x - r.x, pad.y - r.y) < kBoostRadius) {
        if (r.isPlayer && r.boost == 0) say(state, "BOOST");
        r.boost = kBoostTime * (r.isPlayer ? 1 + state.perks.boost : 1);
      }
    }
    checkpoints(state, r);
  }

  collide(state);
  Racer& player = state.racers[0];
  if (!player.finishTime) recordSample(state.recording, state.time, player.x, player.y, player.heading);
  updateFish(state, dt, rand);
  if (input.fish) tryCatch(state);

  if (player.finishTime || state.time >= kTimeLimit) state.done = true;
}

// 근처에서 뛰어오른 물고기를 낚아챈다. 대신 잠깐 감속한다 (레이스 vs 낚시의 트레이드오프)
void tryCatch(RaceState& state) {
  Racer& player = state.racers[0];
  if (state.time < 0 || player.finishTime) return;
  int best = -1;
  double bestD = 0;
  for (int i = 0; i < static_cast<int>(state.fish.size()); i++) {
    const double d = std::hypot(state.fish[i].x - player.x, state.fish[i].y - player.y);
    if (d <= state.stats.catchRadius && (best < 0 || d < bestD)) {
      best = i;
      bestD = d;
    }
  }
  if (best < 0) {
    race_detail::say(state, kMissMessage);
    return;
  }
  const int species = state.fish[best].species;
  state.fish.erase(state.fish.begin() + best);
  state.caught.push_back(species);
  state.lastCatch = LastCatch{species, state.time};
  player.slow = race_detail::kCatchSlowTime;
  race_detail::say(state, std::string(kFish[species].name) + " +" + std::to_string(fishValue(state, species)));
}

int fishValue(const RaceState& state, int species) {
  return static_cast<int>(jsRound(kFish[species].value * (1 + state.perks.fish)));
}

int fishCoins(const RaceState& state) {
  int sum = 0;
  for (int i : state.caught) sum += fishValue(state, i);
  return sum;
}

std::optional<SplitInfo> splitInfo(const RaceState& state) {
  const auto& mine = state.recording.splits;
  const int k = static_cast<int>(mine.size()) - 1;
  if (k < 0 || !state.ghost || k >= static_cast<int>(state.ghost->splits.size())) return std::nullopt;
  return SplitInfo{jsRound((mine[k] - state.ghost->splits[k]) * 100) / 100, mine[k]};
}

std::optional<double> splitNow(const RaceState& state) {
  const auto s = splitInfo(state);
  if (s && state.time - s->at < 3) return s->delta;
  return std::nullopt;
}

bool legendCatchActive(const RaceState& state) {
  const auto& c = state.lastCatch;
  return c && c->species == kLegendSpecies && state.time - c->at < kLegendShowSeconds;
}

RaceResult raceResult(const RaceState& state) {
  RaceResult out;
  const auto order = standings(state);
  const Racer& player = state.racers[0];
  for (int i = 0; i < static_cast<int>(order.size()); i++) {
    if (order[i] == 0) out.rank = i + 1;
  }
  out.finished = player.finishTime.has_value();
  out.prize = static_cast<int>(jsRound(kRankPrize[out.rank - 1] * (out.finished ? 1 : 0.5) * (1 + state.perks.prize)));
  out.time = player.finishTime.value_or(state.time);
  out.fishCoins = fishCoins(state);
  out.caught = state.caught;
  out.perks = state.perks;
  if (out.finished) {
    GhostRun run;
    run.time = jsRound(*player.finishTime * 100) / 100;
    run.dt = kGhostDt;
    run.points = state.recording.points;
    run.splits = state.recording.splits;
    out.run = std::move(run);
  }
  if (state.ghost) out.bestBefore = state.ghost->time;
  for (int idx : order) {
    const Racer& r = state.racers[idx];
    out.standings.push_back(Standing{r.name, r.isPlayer, r.finishTime});
  }
  return out;
}

// ---------------------------------------------------------------- 고스트

namespace ghost_detail {
double r1(double v) { return jsRound(v * 10) / 10; }
double r2(double v) { return jsRound(v * 100) / 100; }
} // namespace ghost_detail

// 시각 t까지 밀린 샘플을 채운다 (프레임이 느려도 간격이 일정하게 유지된다)
void recordSample(Recording& rec, double t, double x, double y, double heading) {
  while ((static_cast<double>(rec.points.size()) / 3) * kGhostDt <= t) {
    rec.points.push_back(ghost_detail::r1(x));
    rec.points.push_back(ghost_detail::r1(y));
    rec.points.push_back(ghost_detail::r2(heading));
  }
}

void recordSplit(Recording& rec, double t) { rec.splits.push_back(ghost_detail::r2(t)); }

Pose ghostPose(const GhostRun& g, double t) {
  const int frames = static_cast<int>(g.points.size() / 3);
  if (frames == 0) return {};
  const double f = minD(maxD(t / g.dt, 0), frames - 1);
  const int i = static_cast<int>(std::floor(f));
  const int j = i + 1 < frames ? i + 1 : frames - 1;
  const double k = f - i;
  const auto& p = g.points;
  const double dh = std::atan2(std::sin(p[j * 3 + 2] - p[i * 3 + 2]), std::cos(p[j * 3 + 2] - p[i * 3 + 2]));
  return {p[i * 3] + (p[j * 3] - p[i * 3]) * k, p[i * 3 + 1] + (p[j * 3 + 1] - p[i * 3 + 1]) * k, p[i * 3 + 2] + dh * k};
}

std::string formatTime(double sec) {
  const int m = static_cast<int>(std::floor(sec / 60));
  char buf[32];
  std::snprintf(buf, sizeof(buf), "%d:%04.1f", m, sec - m * 60);
  return buf;
}

} // namespace yp
