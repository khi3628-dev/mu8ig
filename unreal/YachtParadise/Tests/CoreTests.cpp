// 게임 규칙 코어 테스트 (언리얼 없이 g++로 실행).
// 1) 웹 버전 테스트(lib/boat/*.test.ts 등)를 C++로 옮긴 단위 테스트
// 2) 같은 입력으로 웹 버전과 C++ 이식본을 끝까지 돌려 결과를 비교하는 동일성 테스트 (parity/expected.txt)
// 실행: Tests/run.sh
#include "YPCore.h"
#include "YPSynth.h"

#include <cstdio>
#include <cstdlib>
#include <fstream>
#include <sstream>

using namespace yp;

static int gFailed = 0;
static int gPassed = 0;
static const char* gCurrent = "";

#define CHECK(cond)                                                                    \
  do {                                                                                 \
    if (!(cond)) {                                                                     \
      std::printf("  FAIL [%s] %s:%d  %s\n", gCurrent, __FILE__, __LINE__, #cond);     \
      ++gFailed;                                                                       \
      return;                                                                          \
    }                                                                                  \
  } while (0)
#define CHECK_NEAR(a, b, eps) CHECK(std::abs((a) - (b)) <= (eps))

using TestFn = void (*)();
struct TestCase {
  const char* name;
  TestFn fn;
};
static std::vector<TestCase>& registry() {
  static std::vector<TestCase> r;
  return r;
}
struct Register {
  Register(const char* name, TestFn fn) { registry().push_back({name, fn}); }
};
#define TEST(id, name)                       \
  static void id();                          \
  static Register reg_##id(name, id);        \
  static void id()

static RandFn fixed(double v) {
  return [v]() { return v; };
}
static const RaceInput kIdle{};
static RaceInput gas() {
  RaceInput in;
  in.throttle = 1;
  return in;
}
static RaceInput fishInput() {
  RaceInput in;
  in.fish = true;
  return in;
}
static void pushFish(RaceState& s, int species, double dx, double life = 5) {
  JumpingFish f;
  f.id = 1;
  f.species = species;
  f.x = s.racers[0].x + dx;
  f.y = s.racers[0].y;
  f.life = life;
  f.maxLife = life;
  s.fish.push_back(f);
}
static void putPlayerAtFinish(RaceState& s) {
  Racer& p = s.racers[0];
  p.lap = kLaps - 1;
  p.next = 0;
  p.x = s.course[0].x;
  p.y = s.course[0].y;
}

// ---------------------------------------------------------------- 레이스

TEST(countdown, "카운트다운 동안은 움직이지 않는다") {
  RaceState s = createRace(fixed(0.5));
  const double x = s.racers[1].x, y = s.racers[1].y;
  for (int i = 0; i < 20; i++) updateRace(s, 0.1, gas(), fixed(0.5));
  CHECK(s.time < 0);
  CHECK(s.racers[1].x == x && s.racers[1].y == y);
}

TEST(aiFinish, "AI는 3바퀴를 3분 안에 완주하고 빠른 순서대로 들어온다") {
  RaceState s = createRace(fixed(0.5));
  for (int i = 0; i < (kCountdown + kTimeLimit) * 20 && !s.done; i++) updateRace(s, 0.05, kIdle, fixed(0.5));
  double prev = 0;
  for (int i = 1; i < 6; i++) {
    CHECK(s.racers[i].lap == kLaps);
    CHECK(s.racers[i].finishTime && *s.racers[i].finishTime < kTimeLimit);
    CHECK(*s.racers[i].finishTime > prev);
    prev = *s.racers[i].finishTime;
  }
}

TEST(timeout, "시간 초과 시 미완주 플레이어는 꼴찌, 상금 절반") {
  RaceState s = createRace(fixed(0.5));
  for (int i = 0; i < (kCountdown + kTimeLimit) * 20 + 5 && !s.done; i++) updateRace(s, 0.05, kIdle, fixed(0.5));
  CHECK(s.done);
  const RaceResult r = raceResult(s);
  CHECK(!r.finished);
  CHECK(r.rank == 6);
  CHECK(r.prize == kRankPrize[5] / 2);
  CHECK(!r.run);
}

TEST(finish, "플레이어가 완주하면 즉시 끝나고 1위 상금과 주행 기록을 받는다") {
  RaceState s = createRace(fixed(0.5));
  s.time = 0;
  putPlayerAtFinish(s);
  updateRace(s, 0.01, kIdle, fixed(0.5));
  CHECK(s.done);
  CHECK(standings(s)[0] == 0);
  const RaceResult r = raceResult(s);
  CHECK(r.rank == 1 && r.finished && r.prize == kRankPrize[0]);
  CHECK(r.run && r.run->splits.size() == 1);
  CHECK(s.message == "FINISH");
}

TEST(catchFish, "근처 물고기를 낚으면 코인을 얻고 잠깐 감속한다") {
  RaceState s = createRace(fixed(0.5));
  s.time = 0;
  s.fishTimer = 999;
  pushFish(s, 3, 3, 1);
  updateRace(s, 0.01, fishInput(), fixed(0.5));
  CHECK(s.caught.size() == 1 && s.caught[0] == 3);
  CHECK(s.racers[0].slow > 0);
  CHECK(raceResult(s).fishCoins == kFish[3].value);
  CHECK(s.message == "황금 청새치 +400");
}

TEST(farFish, "멀리 있는 물고기는 낚을 수 없고 MISS") {
  RaceState s = createRace(fixed(0.5));
  s.time = 0;
  s.fishTimer = 999;
  pushFish(s, 0, 30, 1);
  updateRace(s, 0.01, fishInput(), fixed(0.5));
  CHECK(s.caught.empty() && s.fish.size() == 1);
  CHECK(s.message == kMissMessage);
}

TEST(engine, "엔진 업그레이드는 최고 속도를 올린다") {
  auto run = [](double top) {
    PlayerStats st;
    st.topSpeed = top;
    RaceState s = createRace(fixed(0.5), st);
    s.time = 0;
    s.boostPads.clear();
    for (int i = 0; i < 100; i++) updateRace(s, 0.05, gas(), fixed(0.5));
    return s.racers[0].speed;
  };
  CHECK(run(36) > run(30));
}

TEST(net, "그물 업그레이드는 낚시 범위를 넓힌다") {
  PlayerStats st;
  st.catchRadius = kCatchRadius + 10;
  RaceState s = createRace(fixed(0.5), st);
  s.time = 0;
  s.fishTimer = 999;
  pushFish(s, 0, kCatchRadius + 5, 1);
  updateRace(s, 0.01, fishInput(), fixed(0.5));
  CHECK(s.caught.size() == 1);
}

TEST(legend, "황금 청새치만 잠깐 기념 컷 신호") {
  RaceState s = createRace(fixed(0.5));
  s.time = 0;
  s.fishTimer = 999;
  pushFish(s, kLegendSpecies, 2);
  CHECK(!legendCatchActive(s));
  updateRace(s, 0.01, fishInput(), fixed(0.5));
  CHECK(legendCatchActive(s));
  for (int i = 0; i < 60; i++) updateRace(s, 0.05, kIdle, fixed(0.5));
  CHECK(!legendCatchActive(s));
}

TEST(perksPrizeFish, "시설 효과: 상금·낚시 보너스") {
  RacePerks perks;
  perks.prize = 0.1;
  perks.fish = 0.5;
  RaceState s = createRace(fixed(0.5), PlayerStats{}, perks);
  s.time = 0;
  s.fishTimer = 999;
  pushFish(s, 3, 2);
  updateRace(s, 0.01, fishInput(), fixed(0.5));
  putPlayerAtFinish(s);
  updateRace(s, 0.01, kIdle, fixed(0.5));
  const RaceResult r = raceResult(s);
  CHECK(r.rank == 1);
  CHECK(r.prize == 1650);
  CHECK(r.fishCoins == 600);
}

TEST(startDash, "출발 대시: 카운트다운 동안은 서 있다가 GO와 동시에 출발") {
  RacePerks perks;
  perks.startSpeed = 12;
  RaceState s = createRace(fixed(0.5), PlayerStats{}, perks);
  const double x = s.racers[0].x, y = s.racers[0].y;
  updateRace(s, kCountdown - 0.05, kIdle, fixed(0.5));
  CHECK(s.racers[0].x == x && s.racers[0].y == y);
  updateRace(s, 0.1, kIdle, fixed(0.5));
  CHECK(s.racers[0].speed > 11);
  CHECK(std::hypot(s.racers[0].x - x, s.racers[0].y - y) > 0.5);
}

TEST(boostPerk, "파도 부스트 지속시간 보너스") {
  auto run = [](double b) {
    RacePerks perks;
    perks.boost = b;
    RaceState s = createRace(fixed(0.5), PlayerStats{}, perks);
    s.time = 0;
    s.racers[0].x = s.boostPads[0].x;
    s.racers[0].y = s.boostPads[0].y;
    updateRace(s, 0.01, kIdle, fixed(0.5));
    return s.racers[0].boost;
  };
  CHECK_NEAR(run(0), 1.5, 0.05);
  CHECK_NEAR(run(1), 3.0, 0.05);
}

TEST(reverse, "기어 R: 뒤로 가고 최고 후진 속도를 넘지 않는다") {
  RaceState s = createRace(fixed(0.5));
  s.time = 0;
  RaceInput rev = gas();
  rev.reverse = true;
  const double x = s.racers[0].x, y = s.racers[0].y;
  for (int i = 0; i < 100; i++) updateRace(s, 0.05, rev, fixed(0.5));
  const Racer& p = s.racers[0];
  CHECK(p.speed < 0 && p.speed >= -7);
  CHECK((p.x - x) * std::cos(p.heading) + (p.y - y) * std::sin(p.heading) < -10);
}

TEST(reverseFromForward, "전진 중 R이면 먼저 멈춘 뒤 후진") {
  RaceState s = createRace(fixed(0.5));
  s.time = 0;
  s.boostPads.clear();
  s.racers[0].speed = 20;
  RaceInput rev = gas();
  rev.reverse = true;
  updateRace(s, 0.05, rev, fixed(0.5));
  CHECK(s.racers[0].speed > 0 && s.racers[0].speed < 20);
  for (int i = 0; i < 40; i++) updateRace(s, 0.05, rev, fixed(0.5));
  CHECK(s.racers[0].speed < 0);
}

TEST(contact, "충돌: 밀려나고 부딪히는 순간 한 번만 감속·집계") {
  RaceState s = createRace(fixed(0.5));
  s.time = 0;
  s.racers[1].x = s.racers[0].x + 1;
  s.racers[1].y = s.racers[0].y;
  s.racers[0].speed = 20;
  s.racers[1].speed = 20;
  updateRace(s, 0.01, kIdle, fixed(0.5));
  CHECK(std::hypot(s.racers[1].x - s.racers[0].x, s.racers[1].y - s.racers[0].y) >= 3.1);
  CHECK(s.contacts == 1);
  CHECK(s.racers[0].speed < 20);
  s.racers[1].x = s.racers[0].x + 3;
  s.racers[1].y = s.racers[0].y;
  updateRace(s, 0.01, kIdle, fixed(0.5));
  CHECK(s.contacts == 1);
}

TEST(pacing, "접전 보정: 뒤처진 AI는 빨라지고 앞선 AI는 늦춰진다") {
  auto run = [](int playerLap) {
    RaceState s = createRace(fixed(0.5));
    s.time = 0;
    s.boostPads.clear();
    s.racers[0].lap = playerLap;
    s.racers[0].x = 9999;
    for (int i = 0; i < 200; i++) updateRace(s, 0.05, kIdle, fixed(0.5));
    return s.racers[1].speed;
  };
  const double behind = run(2), ahead = run(0);
  CHECK(behind > 27);
  CHECK(behind > ahead);
}

TEST(boundary, "코스 경계 부표: 충분한 개수, 주행 구간 밖, 일정 간격") {
  const auto course = createCourse();
  const auto pts = boundaryPoints(course, kTrackHalf);
  CHECK(pts.size() > 40);
  for (const Vec2& p : pts) {
    const double d = distanceToCourse(course, p.x, p.y);
    CHECK(d >= kTrackHalf - 0.51 && d <= kTrackHalf + 0.01);
  }
  for (size_t i = 0; i < pts.size(); i++)
    for (size_t j = i + 1; j < pts.size(); j++) CHECK(std::hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) >= 14);
}

// ---------------------------------------------------------------- 고스트

TEST(ghostRecord, "출발 후 0.2초 간격으로 기록, 카운트다운 중엔 기록 안 함") {
  RaceState s = createRace(fixed(0.5));
  updateRace(s, 1, kIdle, fixed(0.5));
  CHECK(s.recording.points.empty());
  updateRace(s, 2, kIdle, fixed(0.5));
  for (int i = 0; i < 40; i++) updateRace(s, 0.05, gas(), fixed(0.5));
  const double frames = s.recording.points.size() / 3.0;
  CHECK(frames >= 2 / kGhostDt && frames <= 2 / kGhostDt + 2);
}

TEST(splits, "구간 기록을 베스트와 비교한다") {
  GhostRun g;
  g.time = 100;
  g.points = {0, 0, 0};
  g.splits = {10};
  RaceState s = createRace(fixed(0.5), PlayerStats{}, RacePerks{}, g);
  s.time = 7.95;
  s.racers[0].x = s.course[1].x;
  s.racers[0].y = s.course[1].y;
  updateRace(s, 0.05, kIdle, fixed(0.5));
  CHECK(s.recording.splits.size() == 1 && s.recording.splits[0] == 8);
  const auto info = splitInfo(s);
  CHECK(info && info->delta == -2 && info->at == 8);
}

TEST(ghostPoseTest, "고스트 재생은 보간하고 끝나면 결승점에 머문다") {
  GhostRun g;
  g.time = 1;
  g.dt = 1;
  g.points = {0, 0, 0, 10, 20, 1};
  const Pose a = ghostPose(g, 0.5);
  CHECK(a.x == 5 && a.y == 10 && a.heading == 0.5);
  const Pose b = ghostPose(g, 99);
  CHECK(b.x == 10 && b.y == 20 && b.heading == 1);
  const Pose c = ghostPose(g, -1);
  CHECK(c.x == 0 && c.y == 0);
}

TEST(timeFormat, "시간 표시") {
  CHECK(formatTime(92.44) == "1:32.4");
  CHECK(formatTime(5) == "0:05.0");
}

// ---------------------------------------------------------------- 파라다이스

static int idx(int x, int y) { return y * kGridW + x; }

TEST(placeOk, "모래섬에 시설을 지으면 돈이 빠진다") {
  Save s = createSave();
  CHECK(!place(s, idx(4, 4), ItemId::Palm));
  CHECK(s.money == 400);
  CHECK(s.cells[idx(4, 4)].item == ItemId::Palm);
}

TEST(placeErrors, "지형이 맞지 않거나 돈이 부족하면 지을 수 없다") {
  Save s = createSave();
  CHECK(place(s, idx(0, 0), ItemId::Palm).value_or("").find("모래섬") != std::string::npos);
  CHECK(place(s, idx(4, 4), ItemId::Dock).value_or("").find("바다") != std::string::npos);
  CHECK(place(s, idx(4, 4), ItemId::Villa).value_or("").find("돈") != std::string::npos);
  CHECK(s.money == 500);
}

TEST(dockYacht, "요트는 부두 옆에만, 정박 중인 부두는 팔 수 없다") {
  Save s = createSave();
  s.money = 10000;
  CHECK(place(s, idx(0, 4), ItemId::Yacht).has_value());
  CHECK(!place(s, idx(1, 4), ItemId::Dock));
  CHECK(!place(s, idx(0, 4), ItemId::Yacht));
  CHECK(sell(s, idx(1, 4)).value_or("").find("요트") != std::string::npos);
  CHECK(!sell(s, idx(0, 4)));
  CHECK(!sell(s, idx(1, 4)));
}

TEST(reclaimTest, "섬에 붙은 바다만 메울 수 있다") {
  Save s = createSave();
  CHECK(reclaim(s, idx(0, 0)).has_value());
  CHECK(!reclaim(s, idx(2, 4)));
  CHECK(s.cells[idx(2, 4)].terrain == Terrain::Sand);
  CHECK(s.money == 100);
}

TEST(levels, "럭셔리 점수에 따라 레벨이 오른다") {
  Save s = createSave();
  CHECK(std::string(level(s).current->title) == "무인도");
  s.money = 100000;
  place(s, idx(3, 3), ItemId::Villa);
  CHECK(luxury(s) == 20);
  CHECK(std::string(level(s).current->title) == "작은 해변");
}

TEST(rewards, "레이스 보상과 최고 순위") {
  Save s = createSave();
  applyRaceReward(s, 2, 1000, 90, 2);
  applyRaceReward(s, 4, 450, 0, 0);
  CHECK(s.money == 2040 && s.races == 2 && *s.bestRank == 2 && s.fishCaught == 2);
}

TEST(upgrades, "업그레이드 구매와 최대 레벨") {
  Save s = createSave();
  CHECK(!buyUpgrade(s, UpgradeId::Engine));
  CHECK(s.money == 100);
  CHECK(playerStats(s).topSpeed == 31.5);
  s.money = 1000000;
  for (int i = 0; i < 5; i++) CHECK(!buyUpgrade(s, UpgradeId::Net));
  CHECK(buyUpgrade(s, UpgradeId::Net).value_or("").find("최대") != std::string::npos);
  CHECK(playerStats(s).catchRadius == kCatchRadius + 10);
}

TEST(perksSum, "시설 효과 합산과 상한") {
  Save s = createSave();
  s.money = 1000000;
  place(s, idx(3, 3), ItemId::Sunbed);
  place(s, idx(4, 3), ItemId::Villa);
  place(s, idx(5, 3), ItemId::Bar);
  place(s, idx(6, 3), ItemId::Palm);
  place(s, idx(3, 4), ItemId::Lighthouse);
  place(s, idx(2, 4), ItemId::Dock);
  place(s, idx(1, 4), ItemId::Yacht);
  const RacePerks p = racePerks(s);
  CHECK(p.prize == 0.13 && p.fish == 0.17 && p.startSpeed == 5 && p.boost == 0.3);
  Save s2 = createSave();
  s2.money = 1000000;
  for (int x = 0; x < kGridW; x += 2) place(s2, idx(x, 0), ItemId::Dock);
  for (int x = 1; x < kGridW; x += 2) place(s2, idx(x, 0), ItemId::Superyacht);
  for (int x = 3; x <= 6; x++)
    for (int y : {3, 4}) place(s2, idx(x, y), ItemId::Villa);
  const RacePerks c = racePerks(s2);
  CHECK(c.startSpeed == kPerkCaps.startSpeed && c.prize == kPerkCaps.prize);
  CHECK(perkLabel(RacePerks{0.1, 0, 0, 0}) == "상금 +10%");
  CHECK(perkLabel(RacePerks{0, 0, 12, 0}) == "출발 대시 +43km/h");
}

TEST(english, "언리얼 HUD용 영어 이름·오류 문구") {
  Save s = createSave();
  CHECK(englishError(*place(s, idx(0, 0), ItemId::Palm)) == "BUILD ON SAND ONLY");
  CHECK(englishError(*place(s, idx(4, 4), ItemId::Villa)) == "NOT ENOUGH CREDITS");
  CHECK(englishError("unknown") == "unknown");
  CHECK(std::string(itemDef(ItemId::Superyacht).en) == "SUPERYACHT");
  const RaceState r = createRace(fixed(0.5));
  CHECK(r.racers[0].label == "YOU" && r.racers[1].label == "MARCO");
}

TEST(bestRun, "더 빠른 완주 기록만 베스트로 남는다") {
  Save s = createSave();
  auto run = [](double t) {
    GhostRun g;
    g.time = t;
    return std::optional<GhostRun>(g);
  };
  CHECK(!applyBestRun(s, std::nullopt));
  CHECK(applyBestRun(s, run(100)));
  CHECK(!applyBestRun(s, run(105)));
  CHECK(!applyBestRun(s, run(100)));
  CHECK(applyBestRun(s, run(97.5)));
  CHECK(s.bestRun->time == 97.5);
}

// ---------------------------------------------------------------- 튀기·효과음

struct RideStats {
  double airRatio;
  int lands;
  bool below;
};
static RideStats ride(double v, double seconds) {
  Hop h;
  const double dt = 1.0 / 60;
  int air = 0, lands = 0;
  bool below = false;
  for (int i = 0; i < seconds / dt; i++) {
    const double t = i * dt, x = v * t, z = 0.3 * v * t;
    const double surf = waveHeight(x, z, t) + chop(x, z, t);
    if (stepHop(h, surf, dt, v / 30) > 0) lands++;
    if (h.airborne) air++;
    if (h.y < surf - 1e-9) below = true;
  }
  return {air * dt / seconds, lands, below};
}

TEST(hopRest, "멈춰 있으면 튀지 않는다") {
  const RideStats r = ride(0, 20);
  CHECK(r.airRatio == 0 && r.lands == 0);
}

TEST(hopSpeed, "보통 속도부터 파도 리듬에 맞춰 계속 튄다") {
  CHECK(ride(20, 20).lands / 20.0 > 1.5);
  const RideStats top = ride(30, 20);
  CHECK(top.lands / 20.0 > 1.5);
  CHECK(top.airRatio > 0.5 && top.airRatio < 0.95);
  for (double v : {0.0, 15.0, 30.0, 45.0}) CHECK(!ride(v, 10).below);
}

static std::vector<SfxType> step(RaceState& s, double dt, const RaceInput& in) {
  const SfxSnap before = sfxSnapshot(s);
  updateRace(s, dt, in, fixed(0.5));
  std::vector<SfxType> out;
  for (const SfxEvent& e : sfxEvents(before, sfxSnapshot(s))) out.push_back(e.type);
  return out;
}
static bool has(const std::vector<SfxType>& v, SfxType t) {
  for (SfxType x : v)
    if (x == t) return true;
  return false;
}

TEST(sfxCountdown, "효과음: 카운트다운 삐 2번 + GO 1번") {
  RaceState s = createRace(fixed(0.5));
  int ticks = 0, gos = 0;
  for (int i = 0; i < (kCountdown + 0.5) / 0.05; i++) {
    for (SfxType t : step(s, 0.05, kIdle)) {
      ticks += t == SfxType::Tick;
      gos += t == SfxType::Go;
    }
  }
  CHECK(ticks == 2 && gos == 1);
}

TEST(sfxEventsTest, "효과음: 부스트·충돌·게이트·바퀴·완주") {
  RaceState s = createRace(fixed(0.5));
  s.time = 0;
  s.racers[0].x = s.boostPads[0].x;
  s.racers[0].y = s.boostPads[0].y;
  CHECK(has(step(s, 0.01, kIdle), SfxType::Boost));
  CHECK(!has(step(s, 0.01, kIdle), SfxType::Boost));

  RaceState c = createRace(fixed(0.5));
  c.time = 0;
  c.racers[1].x = c.racers[0].x + 1;
  c.racers[1].y = c.racers[0].y;
  CHECK(has(step(c, 0.01, kIdle), SfxType::Contact));

  RaceState g = createRace(fixed(0.5));
  g.time = 0;
  g.racers[0].x = g.course[1].x;
  g.racers[0].y = g.course[1].y;
  CHECK(has(step(g, 0.01, kIdle), SfxType::Checkpoint));
  g.racers[0].next = 0;
  g.racers[0].x = g.course[0].x;
  g.racers[0].y = g.course[0].y;
  CHECK(has(step(g, 0.01, kIdle), SfxType::Lap));
  g.racers[0].lap = kLaps - 1;
  g.racers[0].next = 0;
  CHECK(has(step(g, 0.01, kIdle), SfxType::Finish));
}


// ---------------------------------------------------------------- 사운드 합성기

static std::vector<float> renderFor(RaceSynth& syn, double seconds, double sr = 48000) {
  std::vector<float> buf(static_cast<size_t>(seconds * sr));
  syn.render(buf.data(), static_cast<int>(buf.size()));
  return buf;
}

// 25~300Hz에서 가장 센 성분 (엔진 점화 주파수 찾기)
static double dominantHz(const std::vector<float>& b, double sr = 48000) {
  const int n = static_cast<int>(sr * 0.5);
  const float* tail = b.data() + b.size() - n;
  double best = 0, bestF = 0;
  for (double f = 25; f <= 300; f += 0.5) {
    const double m = toneMagnitude(tail, n, f, sr);
    if (m > best) {
      best = m;
      bestF = f;
    }
  }
  return bestF;
}

static double rms(const float* d, int n) {
  double s = 0;
  for (int i = 0; i < n; i++) s += d[i] * d[i];
  return std::sqrt(s / n);
}

TEST(synthEngine, "합성 엔진음: 공회전 1300rpm=32.5Hz, 최고속 7800rpm=195Hz, 공중에 뜨면 회전 상승") {
  RaceSynth syn;
  syn.setFrame(0, false, false, false, 0, 1, 0);
  CHECK_NEAR(dominantHz(renderFor(syn, 2)), 32.5, 1.0);
  syn.setFrame(1, true, false, false, 0, 1, 0);
  const auto top = renderFor(syn, 2);
  CHECK_NEAR(dominantHz(top), 195, 2.0);
  syn.setFrame(1, true, true, false, 0, 1, 0);
  CHECK(dominantHz(renderFor(syn, 2)) > 230);
  for (float v : top) CHECK(std::isfinite(v) && std::abs(v) < 1);
}

TEST(synthLoudness, "속도가 오를수록 커지고, 음소거하면 0") {
  RaceSynth syn;
  syn.setFrame(0, false, false, false, 0, 1, 0);
  const auto idle = renderFor(syn, 1);
  syn.setFrame(1, true, false, false, 0, 1, 0);
  const auto fast = renderFor(syn, 1);
  CHECK(rms(fast.data() + 24000, 24000) > rms(idle.data() + 24000, 24000) * 1.5);
  syn.setMuted(true);
  const auto muted = renderFor(syn, 0.1);
  CHECK(rms(muted.data(), static_cast<int>(muted.size())) == 0);
}

TEST(synthEvents, "효과음: 카운트다운 비프는 620Hz, 착수·충돌·완주·황금 청새치는 순간 음량 2배 이상") {
  RaceSynth syn;
  syn.setFrame(0, false, false, false, 0, 1, 0);
  renderFor(syn, 1);
  const auto quiet = renderFor(syn, 0.2);
  syn.trigger(SfxEvent{SfxType::Tick});
  const auto beep = renderFor(syn, 0.2);
  CHECK(toneMagnitude(beep.data(), 9600, 620, 48000) > toneMagnitude(quiet.data(), 9600, 620, 48000) * 10);
  // 짧은 충격음은 평균(RMS)보다 순간 최대값으로 비교한다
  auto peak = [](const std::vector<float>& v) {
    double m = 0;
    for (float x : v) m = maxD(m, std::abs(x));
    return m;
  };
  const double base = peak(quiet);
  for (auto fire : std::vector<std::function<void()>>{
           [&] { syn.splash(3); }, [&] { syn.trigger(SfxEvent{SfxType::Contact}); },
           [&] { syn.trigger(SfxEvent{SfxType::Finish}); }, [&] { syn.trigger(SfxEvent{SfxType::Catch, true}); }}) {
    renderFor(syn, 3.5);  // 이전 소리가 다 사라지게
    fire();
    const auto hit = renderFor(syn, 0.3);
    CHECK(peak(hit) > base * 2);
    for (float v : hit) CHECK(std::isfinite(v) && std::abs(v) < 1);
  }
}

// 들어볼 수 있는 미리듣기: 정지 → 가속 → 통통 튀기 → 라이벌 추월 → 각종 효과음 → 완주 (약 16초)
static void writePreviewWav(const char* path) {
  const int sr = 48000;
  RaceSynth syn(sr);
  std::vector<float> all;
  auto seg = [&](double sec, double speed, bool thr, bool air, bool boost, double prox, double dop) {
    syn.setFrame(speed, thr, air, boost, prox, dop, 1);
    const int n = static_cast<int>(sec * sr);
    std::vector<float> b(n);
    syn.render(b.data(), n);
    all.insert(all.end(), b.begin(), b.end());
  };
  syn.trigger(SfxEvent{SfxType::Tick});
  seg(1, 0, false, false, false, 0, 1);
  syn.trigger(SfxEvent{SfxType::Tick});
  seg(1, 0, false, false, false, 0, 1);
  syn.trigger(SfxEvent{SfxType::Tick});
  seg(1, 0, false, false, false, 0, 1);
  syn.trigger(SfxEvent{SfxType::Go});
  for (int i = 0; i < 30; i++) seg(0.1, i / 30.0, true, false, false, 0, 1);  // 3초 가속
  for (int i = 0; i < 6; i++) {                                               // 통통 튀기
    seg(0.25, 1, true, true, false, 0, 1);
    syn.splash(2.5);
    seg(0.25, 1, true, false, false, 0, 1);
  }
  for (int i = 0; i <= 20; i++) seg(0.1, 1, true, false, false, 1 - std::abs(i - 10) / 10.0, i < 10 ? 1.15 : 0.88);  // 라이벌 추월
  syn.trigger(SfxEvent{SfxType::Contact});
  seg(0.8, 1, true, false, false, 0, 1);
  syn.trigger(SfxEvent{SfxType::Boost});
  seg(1.2, 1.3, true, false, true, 0, 1);
  syn.trigger(SfxEvent{SfxType::Catch, true});
  seg(1.2, 1, true, false, false, 0, 1);
  syn.trigger(SfxEvent{SfxType::Checkpoint});
  seg(0.6, 1, true, false, false, 0, 1);
  syn.trigger(SfxEvent{SfxType::Lap});
  seg(0.8, 1, true, false, false, 0, 1);
  syn.trigger(SfxEvent{SfxType::Finish});
  for (int i = 0; i < 30; i++) seg(0.1, 1 - i / 30.0, false, false, false, 0, 1);
  std::FILE* f = std::fopen(path, "wb");
  if (!f) return;
  const uint32_t dataBytes = static_cast<uint32_t>(all.size() * 2);
  auto w32 = [f](uint32_t v) { std::fwrite(&v, 4, 1, f); };
  auto w16 = [f](uint16_t v) { std::fwrite(&v, 2, 1, f); };
  std::fwrite("RIFF", 1, 4, f);
  w32(36 + dataBytes);
  std::fwrite("WAVEfmt ", 1, 8, f);
  w32(16);
  w16(1);
  w16(1);
  w32(sr);
  w32(sr * 2);
  w16(2);
  w16(16);
  std::fwrite("data", 1, 4, f);
  w32(dataBytes);
  for (float v : all) {
    const auto s = static_cast<int16_t>(clampD(v, -1, 1) * 32767);
    std::fwrite(&s, 2, 1, f);
  }
  std::fclose(f);
  std::printf("미리듣기 저장: %s (%.1f초)\n", path, all.size() / static_cast<double>(sr));
}

// ---------------------------------------------------------------- 웹 버전과의 동일성

// generate.ts와 같은 난수·입력·출력 형식
static std::vector<std::string> runParity() {
  std::vector<std::string> lines;
  char buf[512];
  for (int scenario : {1, 2}) {
    long long seed = scenario * 17;
    RandFn rand = [&seed]() {
      seed = (seed * 9301 + 49297) % 233280;
      return static_cast<double>(seed) / 233280;
    };
    PlayerStats stats;
    RacePerks perks;
    if (scenario == 1) {
      stats = PlayerStats{31.5, 2.42, 11};
      perks = RacePerks{0.13, 0.17, 5, 0.3};
    }
    RaceState s = createRace(rand, stats, perks);
    const double dt = 1.0 / 60;
    for (int i = 0; i < 12000 && !s.done; i++) {
      const Racer& p = s.racers[0];
      const Vec2 cp = s.course[p.next];
      double d = std::atan2(cp.y - p.y, cp.x - p.x) - p.heading;
      d = std::atan2(std::sin(d), std::cos(d));
      const double wobble = scenario == 2 ? std::sin(i * 0.02) * 0.6 : 0;
      RaceInput in;
      in.throttle = 1;
      in.steer = maxD(-1, minD(1, (d + wobble) * 3));
      in.fish = i % 90 == 0;
      in.reverse = scenario == 2 && i >= 400 && i < 460;
      updateRace(s, dt, in, rand);
      if (i % 600 == 0) {
        const Racer& r0 = s.racers[0];
        std::snprintf(buf, sizeof(buf),
                      "S%d step=%d t=%.6f p=%.6f,%.6f v=%.6f lap=%d next=%d ai1=%.6f,%.6f contacts=%d caught=%d coins=%d rec=%d msg=%s",
                      scenario, i, s.time, r0.x, r0.y, r0.speed, r0.lap, r0.next, s.racers[1].x, s.racers[1].y, s.contacts,
                      static_cast<int>(s.caught.size()), fishCoins(s), static_cast<int>(s.recording.points.size()),
                      s.message.c_str());
        lines.push_back(buf);
      }
    }
    const RaceResult r = raceResult(s);
    std::string order;
    for (const auto& st : r.standings) order += (order.empty() ? "" : "/") + st.name;
    std::snprintf(buf, sizeof(buf), "S%d result rank=%d finished=%s time=%.6f prize=%d coins=%d caught=%d splits=%d order=%s",
                  scenario, r.rank, r.finished ? "true" : "false", r.time, r.prize, r.fishCoins,
                  static_cast<int>(r.caught.size()), r.run ? static_cast<int>(r.run->splits.size()) : 0, order.c_str());
    lines.push_back(buf);
  }
  return lines;
}

// 숫자는 오차 1e-4 안에서, 나머지는 글자 그대로 같아야 한다
static bool sameLine(const std::string& a, const std::string& b, std::string& why) {
  std::istringstream sa(a), sb(b);
  std::string ta, tb;
  while (true) {
    const bool ra = static_cast<bool>(sa >> ta), rb = static_cast<bool>(sb >> tb);
    if (!ra || !rb) return ra == rb;
    if (ta == tb) continue;
    // key=1.234,5.678 형태를 숫자 단위로 비교
    const auto ka = ta.substr(0, ta.find('=')), kb = tb.substr(0, tb.find('='));
    if (ka != kb) {
      why = ta + " vs " + tb;
      return false;
    }
    std::string va = ta.substr(ta.find('=') + 1), vb = tb.substr(tb.find('=') + 1);
    std::istringstream na(va), nb(vb);
    std::string xa, xb;
    while (std::getline(na, xa, ',') && std::getline(nb, xb, ',')) {
      char* ea = nullptr;
      char* eb = nullptr;
      const double da = std::strtod(xa.c_str(), &ea), db = std::strtod(xb.c_str(), &eb);
      if (*ea || *eb || std::abs(da - db) > 1e-4) {
        why = ta + " vs " + tb;
        return false;
      }
    }
  }
}

static std::string gParityFile;

TEST(parity, "웹 버전(TypeScript)과 같은 입력이면 같은 레이스가 나온다") {
  std::ifstream f(gParityFile);
  CHECK(f.good());
  std::vector<std::string> expected;
  for (std::string line; std::getline(f, line);) {
    if (!line.empty()) expected.push_back(line);
  }
  const auto actual = runParity();
  CHECK(expected.size() == actual.size());
  for (size_t i = 0; i < expected.size(); i++) {
    std::string why;
    if (!sameLine(expected[i], actual[i], why)) {
      std::printf("    expected: %s\n    actual:   %s\n    diff: %s\n", expected[i].c_str(), actual[i].c_str(), why.c_str());
      CHECK(false);
    }
  }
  std::printf("    %zu줄 일치 (예: %s)\n", actual.size(), actual.back().c_str());
}

int main(int argc, char** argv) {
  gParityFile = argc > 1 ? argv[1] : "parity/expected.txt";
  if (argc > 3 && std::string(argv[2]) == "--wav") writePreviewWav(argv[3]);
  for (const TestCase& t : registry()) {
    gCurrent = t.name;
    const int before = gFailed;
    t.fn();
    if (gFailed == before) {
      ++gPassed;
      std::printf("  ok   %s\n", t.name);
    }
  }
  std::printf("\n%d passed, %d failed\n", gPassed, gFailed);
  return gFailed == 0 ? 0 : 1;
}
