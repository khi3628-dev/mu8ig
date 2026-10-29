// 요트 파라다이스 레이싱 — 게임 규칙 코어 (엔진 독립 C++17).
// 웹 버전(lib/boat/*.ts, lib/boat3d/{bounce,sfx,water}.ts)을 그대로 옮긴 것이다.
// 언리얼 모듈 안에서도, 엔진 없이 g++로도 컴파일된다 (Tests/CoreTests.cpp).
//
// 언리얼 빌드 환경을 위한 규칙:
//  - 예외·RTTI를 쓰지 않는다 (UE 기본 설정에서 꺼져 있다)
//  - PI/min/max 같은 이름은 UE·Windows 매크로와 겹치므로 쓰지 않는다 (상수는 k 접두사)
//  - 파일 간 공용 도우미는 이 헤더의 inline 함수로만 둔다 (유니티 빌드 충돌 방지)
#pragma once

#include <array>
#include <cmath>
#include <cstdint>
#include <functional>
#include <optional>
#include <set>
#include <string>
#include <utility>
#include <vector>

namespace yp {

// ---------------------------------------------------------------- 공용 도우미

constexpr double kPi = 3.14159265358979323846;

// JS Math.round와 같은 반올림 (0.5는 위로)
inline double jsRound(double v) { return std::floor(v + 0.5); }
inline double minD(double a, double b) { return a < b ? a : b; }
inline double maxD(double a, double b) { return a > b ? a : b; }
inline double clampD(double v, double lo, double hi) { return v < lo ? lo : (v > hi ? hi : v); }

// 0 이상 1 미만의 난수를 돌려주는 함수 (테스트에서는 고정값을 넣는다)
using RandFn = std::function<double()>;

struct Vec2 {
  double x = 0;
  double y = 0;
};

// ---------------------------------------------------------------- 레이스 상수

constexpr int kLaps = 3;
constexpr double kTimeLimit = 180;
constexpr double kCountdown = 3;
constexpr double kTrackHalf = 18;        // 코스 중심선에서 이 거리 밖이면 코스 이탈
constexpr double kCheckpointRadius = 22;
constexpr double kCatchRadius = 9;
constexpr std::array<int, 6> kRankPrize = {1500, 1000, 700, 450, 300, 200};
constexpr double kGhostDt = 0.2;         // 고스트 기록 간격 (초)
constexpr double kLegendShowSeconds = 2.5;
inline const char* const kMissMessage = "MISS";

// 업그레이드로 바뀌는 플레이어 능력치
struct PlayerStats {
  double topSpeed = 30;
  double turnRate = 2.2;
  double catchRadius = kCatchRadius;
};

inline PlayerStats baseStats() { return PlayerStats{}; }

// 파라다이스 시설이 플레이어에게 주는 레이스 효과
struct RacePerks {
  double prize = 0;       // 순위 상금 보너스 비율
  double fish = 0;        // 낚시 코인 보너스 비율
  double startSpeed = 0;  // 출발 신호와 동시에 갖는 속도 (m/s)
  double boost = 0;       // 파도 부스트 지속시간 보너스 비율
};

struct Racer {
  std::string name;
  std::string label; // 언리얼 HUD용 영어 표시 이름
  uint32_t color = 0xffffff; // 0xRRGGBB
  bool isPlayer = false;
  double x = 0;
  double y = 0;
  double heading = 0;   // 라디안, 0 = +x
  double speed = 0;     // m/s (후진이면 음수)
  double topSpeed = 0;  // AI 목표 속도
  double laneOffset = 0;
  int lap = 0;
  int next = 1;         // 다음에 통과할 체크포인트 인덱스
  std::optional<double> finishTime;
  double boost = 0;
  double slow = 0;
};

struct FishSpecies {
  const char* name;
  const char* en;
  int value;
  int weight;
};

inline constexpr std::array<FishSpecies, 4> kFish = {{
    {"정어리", "SARDINE", 30, 50},
    {"고등어", "MACKEREL", 60, 30},
    {"참치", "TUNA", 150, 15},
    {"황금 청새치", "GOLDEN MARLIN", 400, 5},
}};
constexpr int kLegendSpecies = static_cast<int>(kFish.size()) - 1;

struct JumpingFish {
  int id = 0;
  int species = 0;
  double x = 0;
  double y = 0;
  double life = 0;
  double maxLife = 0;
};

struct RaceInput {
  double throttle = 0;  // -1..1
  double steer = 0;     // -1..1 (양수 = 오른쪽)
  bool fish = false;    // 이번 프레임에 낚시 키를 눌렀는지
  bool reverse = false; // 기어 R
};

// 고스트: 플레이어 주행을 일정 간격으로 기록한다 ([x, y, heading] 반복)
struct GhostRun {
  double time = 0;
  double dt = kGhostDt;
  std::vector<double> points;
  std::vector<double> splits;
};

struct Recording {
  std::vector<double> points;
  std::vector<double> splits;
};

struct LastCatch {
  int species = 0;
  double at = 0;
};

struct RaceState {
  PlayerStats stats;
  RacePerks perks;
  std::optional<GhostRun> ghost;   // 함께 달릴 베스트 기록
  Recording recording;             // 이번 레이스의 플레이어 주행 기록
  double time = -kCountdown;       // 출발 신호 이후 경과 시간 (카운트다운 중엔 음수)
  std::vector<Vec2> course;
  std::vector<Vec2> boostPads;
  std::vector<Racer> racers;       // [0]이 플레이어
  std::vector<JumpingFish> fish;
  std::vector<int> caught;
  std::optional<LastCatch> lastCatch;
  int contacts = 0;                       // 플레이어가 부딪힌 횟수 (효과음용)
  std::set<std::pair<int, int>> touching; // 지금 맞닿아 있는 쌍
  double fishTimer = 1;
  int nextFishId = 1;
  std::string message;
  double messageTimer = 0;
  bool done = false;
};

struct Standing {
  std::string name;
  bool isPlayer = false;
  std::optional<double> time;
};

struct RaceResult {
  int rank = 0;
  bool finished = false;
  double time = 0;
  int prize = 0;
  int fishCoins = 0;
  std::vector<int> caught;
  RacePerks perks;
  std::optional<GhostRun> run;      // 완주했을 때만
  std::optional<double> bestBefore;  // 이번 레이스 전의 베스트 기록
  std::vector<Standing> standings;
};

struct SplitInfo {
  double delta = 0; // 음수면 베스트보다 빠름
  double at = 0;
};

std::vector<Vec2> createCourse();
RaceState createRace(const RandFn& rand, const PlayerStats& stats = PlayerStats{}, const RacePerks& perks = RacePerks{},
                     std::optional<GhostRun> ghost = std::nullopt);
double distanceToCourse(const std::vector<Vec2>& course, double x, double y);
// 코스 중심선에서 half 만큼 떨어진 경계선 위에 부표를 놓을 좌표 (웹 버전 lib/boat3d/track.ts)
std::vector<Vec2> boundaryPoints(const std::vector<Vec2>& course, double half, double gap = 14);
double progress(const RaceState& state, const Racer& r);
std::vector<int> standings(const RaceState& state); // 순위 순서의 레이서 인덱스
void updateRace(RaceState& state, double dt, const RaceInput& input, const RandFn& rand);
void tryCatch(RaceState& state);
int fishValue(const RaceState& state, int species);
int fishCoins(const RaceState& state);
std::optional<SplitInfo> splitInfo(const RaceState& state);
std::optional<double> splitNow(const RaceState& state);
bool legendCatchActive(const RaceState& state);
RaceResult raceResult(const RaceState& state);

// ---------------------------------------------------------------- 고스트

void recordSample(Recording& rec, double t, double x, double y, double heading);
void recordSplit(Recording& rec, double t);

struct Pose {
  double x = 0;
  double y = 0;
  double heading = 0;
};
Pose ghostPose(const GhostRun& g, double t);
std::string formatTime(double sec); // "1:32.4"

// ---------------------------------------------------------------- 파라다이스

constexpr int kGridW = 10;
constexpr int kGridH = 8;
constexpr int kSaveVersion = 3;
constexpr int kReclaimCost = 400;
constexpr double kSellRate = 0.5;

enum class Terrain : uint8_t { Water, Sand };

enum class ItemId : uint8_t { Palm, Sunbed, Bar, Pool, Villa, Lighthouse, Dock, Yacht, Superyacht, Count };
constexpr int kItemCount = static_cast<int>(ItemId::Count);

struct ItemDef {
  const char* name;
  const char* en;
  int cost;
  Terrain on;
  bool needsDock; // 요트류는 부두 옆에만 정박할 수 있다
  int luxury;
  RacePerks perk;
};

const ItemDef& itemDef(ItemId id);
inline constexpr RacePerks kPerkCaps{0.5, 1, 20, 1};

struct LevelDef {
  int luxury;
  const char* title;
  const char* en;
};
inline constexpr std::array<LevelDef, 5> kLevels = {{
    {0, "무인도", "DESERTED ISLAND"},
    {10, "작은 해변", "LITTLE BEACH"},
    {40, "프라이빗 비치", "PRIVATE BEACH"},
    {100, "럭셔리 마리나", "LUXURY MARINA"},
    {200, "요트 파라다이스", "YACHT PARADISE"},
}};

struct Cell {
  Terrain terrain = Terrain::Water;
  std::optional<ItemId> item;
};

enum class UpgradeId : uint8_t { Engine, Handling, Net, Count };
constexpr int kUpgradeCount = static_cast<int>(UpgradeId::Count);

struct UpgradeDef {
  const char* name;
  const char* desc;
  const char* en;
  const char* descEn;
  std::array<int, 5> costs;
};
const UpgradeDef& upgradeDef(UpgradeId id);

struct Save {
  int version = kSaveVersion;
  int money = 500;
  std::array<int, kUpgradeCount> upgrades{};
  std::vector<Cell> cells;
  int races = 0;
  std::optional<int> bestRank;
  int fishCaught = 0;
  std::optional<GhostRun> bestRun;
};

// 실패 사유를 돌려준다. 값이 없으면 성공.
using Error = std::optional<std::string>;

Save createSave();
Error placeError(const Save& save, int i, ItemId id);
Error place(Save& save, int i, ItemId id);
Error reclaimError(const Save& save, int i);
Error reclaim(Save& save, int i);
Error sell(Save& save, int i);
int luxury(const Save& save);

struct LevelInfo {
  int index = 0;
  const LevelDef* current = nullptr;
  const LevelDef* next = nullptr; // 마지막 단계면 nullptr
};
LevelInfo level(const Save& save);

void applyRaceReward(Save& save, int rank, int prize, int fishCoinsEarned, int fishCount);
bool applyBestRun(Save& save, const std::optional<GhostRun>& run);
std::optional<int> upgradeCost(const Save& save, UpgradeId id);
Error buyUpgrade(Save& save, UpgradeId id);
PlayerStats playerStats(const Save& save);
RacePerks racePerks(const Save& save);
std::string perkLabel(const RacePerks& p);
// 위 함수들이 돌려주는 한글 오류 문구의 영어판 (언리얼 HUD용). 모르는 문구면 그대로 돌려준다.
std::string englishError(const std::string& message);

// ---------------------------------------------------------------- 파도·튀기·효과음

double waveHeight(double x, double z, double t, double freq = 1, double amp = 0.35);
double chop(double x, double z, double t);

struct Hop {
  double y = 0;
  double vy = 0;
  std::optional<double> prevSurf;
  bool airborne = false;
};
// 한 프레임 진행. 착수하는 순간이면 충격 속도(m/s)를, 아니면 0을 돌려준다.
double stepHop(Hop& h, double surf, double dt, double speedFrac);

enum class SfxType : uint8_t { Tick, Go, Boost, Catch, Miss, Checkpoint, Lap, Finish, Gear, Contact };

struct SfxEvent {
  SfxType type;
  bool legend = false;
};

struct SfxSnap {
  int count = 0;
  bool boost = false;
  int caught = 0;
  std::optional<int> lastSpecies;
  int splits = 0;
  int lap = 0;
  bool finished = false;
  std::string msg;
  double msgTimer = 0;
  int contacts = 0;
};

SfxSnap sfxSnapshot(const RaceState& s);
std::vector<SfxEvent> sfxEvents(const SfxSnap& prev, const SfxSnap& cur);

} // namespace yp
