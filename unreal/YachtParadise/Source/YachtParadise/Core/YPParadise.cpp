// 요트 파라다이스: 시설 건설·업그레이드·보상 (웹 버전 lib/boat/paradise.ts를 옮김)
#include "YPCore.h"

namespace yp {

namespace paradise_detail {

const std::array<ItemDef, kItemCount> kCatalog = {{
    {"야자수", "PALM TREE", 100, Terrain::Sand, false, 1, RacePerks{0, 0.02, 0, 0}},
    {"선베드", "SUNBED", 200, Terrain::Sand, false, 2, RacePerks{0.03, 0, 0, 0}},
    {"비치 바", "BEACH BAR", 600, Terrain::Sand, false, 6, RacePerks{0, 0.15, 0, 0}},
    {"인피니티 풀", "INFINITY POOL", 1200, Terrain::Sand, false, 12, RacePerks{0, 0, 0, 0.1}},
    {"화이트 빌라", "WHITE VILLA", 2000, Terrain::Sand, false, 20, RacePerks{0.1, 0, 0, 0}},
    {"등대", "LIGHTHOUSE", 3000, Terrain::Sand, false, 30, RacePerks{0, 0, 0, 0.3}},
    {"부두", "DOCK", 300, Terrain::Water, false, 2, RacePerks{}},
    {"요트", "SAILING YACHT", 2500, Terrain::Water, true, 25, RacePerks{0, 0, 5, 0}},
    {"슈퍼요트", "SUPERYACHT", 8000, Terrain::Water, true, 80, RacePerks{0, 0, 12, 0}},
}};

const std::array<UpgradeDef, kUpgradeCount> kUpgrades = {{
    {"엔진", "최고 속도 +1.5", "ENGINE", "TOP SPEED +5.4KM/H", {400, 800, 1500, 2500, 4000}},
    {"핸들링", "회전력 +10%", "HANDLING", "TURN RATE +10%", {300, 600, 1100, 1800, 3000}},
    {"낚시 그물", "낚시 범위 +2m", "FISHING NET", "CATCH RANGE +2M", {250, 500, 900, 1500, 2500}},
}};

std::vector<int> neighbors(int i) {
  const int x = i % kGridW, y = i / kGridW;
  std::vector<int> out;
  const int d[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
  for (const auto& o : d) {
    const int nx = x + o[0], ny = y + o[1];
    if (nx >= 0 && nx < kGridW && ny >= 0 && ny < kGridH) out.push_back(ny * kGridW + nx);
  }
  return out;
}

bool hasNeighborItem(const Save& save, int i, ItemId id, int except = -1) {
  for (int n : neighbors(i)) {
    if (n != except && save.cells[n].item == id) return true;
  }
  return false;
}

} // namespace paradise_detail

const ItemDef& itemDef(ItemId id) { return paradise_detail::kCatalog[static_cast<int>(id)]; }
const UpgradeDef& upgradeDef(UpgradeId id) { return paradise_detail::kUpgrades[static_cast<int>(id)]; }

Save createSave() {
  Save s;
  for (int y = 0; y < kGridH; y++) {
    for (int x = 0; x < kGridW; x++) {
      const bool island = x >= 3 && x <= 6 && y >= 3 && y <= 5;
      s.cells.push_back(Cell{island ? Terrain::Sand : Terrain::Water, std::nullopt});
    }
  }
  return s;
}

Error placeError(const Save& save, int i, ItemId id) {
  const Cell& cell = save.cells[i];
  const ItemDef& def = itemDef(id);
  if (cell.item) return std::string("이미 시설이 있다");
  if (cell.terrain != def.on) {
    return std::string(def.on == Terrain::Sand ? "모래섬 위에만 지을 수 있다" : "바다 위에만 지을 수 있다");
  }
  if (def.needsDock && !paradise_detail::hasNeighborItem(save, i, ItemId::Dock)) return std::string("부두 옆에만 정박할 수 있다");
  if (save.money < def.cost) return std::string("돈이 부족하다");
  return std::nullopt;
}

Error place(Save& save, int i, ItemId id) {
  Error err = placeError(save, i, id);
  if (err) return err;
  save.money -= itemDef(id).cost;
  save.cells[i].item = id;
  return std::nullopt;
}

Error reclaimError(const Save& save, int i) {
  if (save.cells[i].terrain == Terrain::Sand) return std::string("이미 모래섬이다");
  if (save.cells[i].item) return std::string("시설을 먼저 치워야 한다");
  bool touchesSand = false;
  for (int n : paradise_detail::neighbors(i)) touchesSand = touchesSand || save.cells[n].terrain == Terrain::Sand;
  if (!touchesSand) return std::string("섬에 붙여서만 메울 수 있다");
  if (save.money < kReclaimCost) return std::string("돈이 부족하다");
  return std::nullopt;
}

Error reclaim(Save& save, int i) {
  Error err = reclaimError(save, i);
  if (err) return err;
  save.money -= kReclaimCost;
  save.cells[i].terrain = Terrain::Sand;
  return std::nullopt;
}

// 시설을 팔아 절반을 돌려받는다. 정박 중인 요트가 있는 부두는 팔 수 없다.
Error sell(Save& save, int i) {
  const auto id = save.cells[i].item;
  if (!id) return std::string("팔 시설이 없다");
  if (*id == ItemId::Dock) {
    for (int n : paradise_detail::neighbors(i)) {
      const auto moored = save.cells[n].item;
      if (moored && itemDef(*moored).needsDock && !paradise_detail::hasNeighborItem(save, n, ItemId::Dock, i)) {
        return std::string("정박 중인 요트가 있다");
      }
    }
  }
  save.money += static_cast<int>(std::floor(itemDef(*id).cost * kSellRate));
  save.cells[i].item.reset();
  return std::nullopt;
}

int luxury(const Save& save) {
  int sum = 0;
  for (const Cell& c : save.cells) {
    if (c.item) sum += itemDef(*c.item).luxury;
  }
  return sum;
}

LevelInfo level(const Save& save) {
  const int lux = luxury(save);
  LevelInfo info;
  for (int i = 0; i < static_cast<int>(kLevels.size()); i++) {
    if (lux >= kLevels[i].luxury) info.index = i;
  }
  info.current = &kLevels[info.index];
  info.next = info.index + 1 < static_cast<int>(kLevels.size()) ? &kLevels[info.index + 1] : nullptr;
  return info;
}

void applyRaceReward(Save& save, int rank, int prize, int fishCoinsEarned, int fishCount) {
  save.money += prize + fishCoinsEarned;
  save.races += 1;
  save.fishCaught += fishCount;
  save.bestRank = save.bestRank ? (rank < *save.bestRank ? rank : *save.bestRank) : rank;
}

// 더 빠른 완주 기록이면 베스트로 바꾸고 true를 돌려준다
bool applyBestRun(Save& save, const std::optional<GhostRun>& run) {
  if (!run || (save.bestRun && save.bestRun->time <= run->time)) return false;
  save.bestRun = run;
  return true;
}

std::optional<int> upgradeCost(const Save& save, UpgradeId id) {
  const auto& costs = upgradeDef(id).costs;
  const int lv = save.upgrades[static_cast<int>(id)];
  if (lv >= static_cast<int>(costs.size())) return std::nullopt;
  return costs[lv];
}

Error buyUpgrade(Save& save, UpgradeId id) {
  const auto cost = upgradeCost(save, id);
  if (!cost) return std::string("최대 레벨이다");
  if (save.money < *cost) return std::string("돈이 부족하다");
  save.money -= *cost;
  save.upgrades[static_cast<int>(id)] += 1;
  return std::nullopt;
}

PlayerStats playerStats(const Save& save) {
  const auto& u = save.upgrades;
  PlayerStats s;
  s.topSpeed = baseStats().topSpeed + u[static_cast<int>(UpgradeId::Engine)] * 1.5;
  s.turnRate = baseStats().turnRate * (1 + u[static_cast<int>(UpgradeId::Handling)] * 0.1);
  s.catchRadius = baseStats().catchRadius + u[static_cast<int>(UpgradeId::Net)] * 2;
  return s;
}

RacePerks racePerks(const Save& save) {
  RacePerks sum;
  for (const Cell& c : save.cells) {
    if (!c.item) continue;
    const RacePerks& p = itemDef(*c.item).perk;
    sum.prize += p.prize;
    sum.fish += p.fish;
    sum.startSpeed += p.startSpeed;
    sum.boost += p.boost;
  }
  auto cap = [](double v, double c) { return minD(c, jsRound(v * 1000) / 1000); };
  sum.prize = cap(sum.prize, kPerkCaps.prize);
  sum.fish = cap(sum.fish, kPerkCaps.fish);
  sum.startSpeed = cap(sum.startSpeed, kPerkCaps.startSpeed);
  sum.boost = cap(sum.boost, kPerkCaps.boost);
  return sum;
}

std::string englishError(const std::string& message) {
  // 같은 소스의 같은 문자열과 비교하므로, 컴파일러가 소스를 어떤 인코딩으로 읽어도 결과가 같다
  static const std::array<std::pair<const char*, const char*>, 11> table = {{
      {"이미 시설이 있다", "THIS CELL IS TAKEN"},
      {"모래섬 위에만 지을 수 있다", "BUILD ON SAND ONLY"},
      {"바다 위에만 지을 수 있다", "BUILD ON WATER ONLY"},
      {"부두 옆에만 정박할 수 있다", "MOOR NEXT TO A DOCK"},
      {"돈이 부족하다", "NOT ENOUGH CREDITS"},
      {"이미 모래섬이다", "ALREADY SAND"},
      {"시설을 먼저 치워야 한다", "REMOVE THE BUILDING FIRST"},
      {"섬에 붙여서만 메울 수 있다", "RECLAIM NEXT TO THE ISLAND"},
      {"팔 시설이 없다", "NOTHING TO SELL"},
      {"정박 중인 요트가 있다", "A YACHT IS MOORED HERE"},
      {"최대 레벨이다", "ALREADY MAX LEVEL"},
  }};
  for (const auto& [ko, en] : table) {
    if (message == ko) return en;
  }
  return message;
}

std::string perkLabel(const RacePerks& p) {
  std::string out;
  auto add = [&out](const std::string& s) { out += (out.empty() ? "" : " · ") + s; };
  auto pct = [](double v) { return std::to_string(static_cast<int>(jsRound(v * 100))); };
  if (p.prize != 0) add("상금 +" + pct(p.prize) + "%");
  if (p.fish != 0) add("낚시 +" + pct(p.fish) + "%");
  if (p.startSpeed != 0) add("출발 대시 +" + std::to_string(static_cast<int>(jsRound(p.startSpeed * 3.6))) + "km/h");
  if (p.boost != 0) add("부스트 +" + pct(p.boost) + "%");
  return out;
}

} // namespace yp
