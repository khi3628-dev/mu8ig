import { describe, expect, it } from "vitest";
import { BASE_STATS, NO_PERKS } from "./race";
import {
  CATALOG, GRID_W, PERK_CAPS, RECLAIM_COST, UPGRADES, applyRaceReward, buyUpgrade, createSave, level, loadSave,
  luxury, perkLabel, place, playerStats, racePerks, reclaim, sell,
} from "./paradise";

const idx = (x: number, y: number) => y * GRID_W + x;
const SAND = idx(4, 4);
const SHORE_WATER = idx(2, 4); // 섬(3..6, 3..5) 왼쪽 바다
const FAR_WATER = idx(0, 0);

describe("yacht paradise", () => {
  it("모래섬에 시설을 지으면 돈이 빠진다", () => {
    const s = createSave();
    expect(place(s, SAND, "palm")).toBeNull();
    expect(s.money).toBe(500 - CATALOG.palm.cost);
    expect(s.cells[SAND].item).toBe("palm");
  });

  it("지형이 맞지 않거나 돈이 부족하면 지을 수 없다", () => {
    const s = createSave();
    expect(place(s, FAR_WATER, "palm")).toMatch(/모래섬/);
    expect(place(s, SAND, "dock")).toMatch(/바다/);
    expect(place(s, SAND, "villa")).toMatch(/돈/);
    expect(s.money).toBe(500);
  });

  it("요트는 부두 옆에만 정박하고, 정박 중인 부두는 팔 수 없다", () => {
    const s = createSave();
    s.money = 10000;
    expect(place(s, idx(0, 4), "yacht")).toMatch(/부두/);
    expect(place(s, idx(1, 4), "dock")).toBeNull();
    expect(place(s, idx(0, 4), "yacht")).toBeNull();
    expect(sell(s, idx(1, 4))).toMatch(/요트/);
    expect(sell(s, idx(0, 4))).toBeNull();
    expect(sell(s, idx(1, 4))).toBeNull();
  });

  it("섬에 붙은 바다만 메워 확장할 수 있다", () => {
    const s = createSave();
    expect(reclaim(s, FAR_WATER)).toMatch(/섬에 붙여서/);
    expect(reclaim(s, SHORE_WATER)).toBeNull();
    expect(s.cells[SHORE_WATER].terrain).toBe("sand");
    expect(s.money).toBe(500 - RECLAIM_COST);
  });

  it("팔면 절반을 돌려받는다", () => {
    const s = createSave();
    place(s, SAND, "sunbed");
    sell(s, SAND);
    expect(s.money).toBe(500 - CATALOG.sunbed.cost / 2);
  });

  it("럭셔리 점수에 따라 레벨이 오른다", () => {
    const s = createSave();
    expect(level(s).title).toBe("무인도");
    s.money = 100000;
    place(s, idx(3, 3), "villa");
    expect(luxury(s)).toBe(20);
    expect(level(s).title).toBe("작은 해변");
  });

  it("레이스 보상을 반영하고 저장본을 복원한다", () => {
    const s = createSave();
    applyRaceReward(s, 2, 1000, 90, 2);
    applyRaceReward(s, 4, 450, 0, 0);
    expect(s).toMatchObject({ money: 2040, races: 2, bestRank: 2, fishCaught: 2 });
    expect(loadSave(JSON.stringify(s))).toEqual(s);
    expect(loadSave("garbage")).toEqual(createSave());
    expect(loadSave(null)).toEqual(createSave());
  });

  it("업그레이드를 사면 돈이 빠지고 능력치가 오른다", () => {
    const s = createSave();
    expect(playerStats(s)).toEqual(BASE_STATS);
    expect(buyUpgrade(s, "engine")).toBeNull();
    expect(s.money).toBe(500 - UPGRADES.engine.costs[0]);
    expect(playerStats(s).topSpeed).toBe(BASE_STATS.topSpeed + 1.5);
    expect(buyUpgrade(s, "engine")).toMatch(/돈/);
  });

  it("최대 레벨 이상은 살 수 없다", () => {
    const s = createSave();
    s.money = 1e6;
    for (let i = 0; i < UPGRADES.net.costs.length; i++) expect(buyUpgrade(s, "net")).toBeNull();
    expect(buyUpgrade(s, "net")).toMatch(/최대/);
    expect(playerStats(s).catchRadius).toBe(BASE_STATS.catchRadius + 10);
  });

  it("v1 저장본은 업그레이드 0으로 이어서 불러온다", () => {
    const v2 = createSave();
    v2.money = 1234;
    const v1: Record<string, unknown> = { ...v2, version: 1 };
    delete v1.upgrades;
    const loaded = loadSave(JSON.stringify(v1));
    expect(loaded.money).toBe(1234);
    expect(loaded.version).toBe(2);
    expect(loaded.upgrades).toEqual({ engine: 0, handling: 0, net: 0 });
  });

  it("시설이 없으면 레이스 효과도 없다", () => {
    expect(racePerks(createSave())).toEqual(NO_PERKS);
  });

  it("지은 시설의 레이스 효과가 더해진다", () => {
    const s = createSave();
    s.money = 1e6;
    place(s, idx(3, 3), "sunbed");
    place(s, idx(4, 3), "villa");
    place(s, idx(5, 3), "bar");
    place(s, idx(6, 3), "palm");
    place(s, idx(3, 4), "lighthouse");
    place(s, idx(2, 4), "dock");
    place(s, idx(1, 4), "yacht");
    expect(racePerks(s)).toEqual({ prize: 0.13, fish: 0.17, startSpeed: 5, boost: 0.3 });
  });

  it("같은 시설을 잔뜩 지어도 상한에서 멈춘다", () => {
    const s = createSave();
    s.money = 1e6;
    for (let x = 0; x < GRID_W; x += 2) place(s, idx(x, 0), "dock");
    for (let x = 1; x < GRID_W; x += 2) place(s, idx(x, 0), "superyacht");
    for (let x = 3; x <= 6; x++) for (const y of [3, 4]) place(s, idx(x, y), "villa"); // 빌라 8채 = +80%
    const p = racePerks(s);
    expect(p.startSpeed).toBe(PERK_CAPS.startSpeed);
    expect(p.prize).toBe(PERK_CAPS.prize);
  });

  it("효과 설명 문구", () => {
    expect(perkLabel({ prize: 0.1 })).toBe("상금 +10%");
    expect(perkLabel({ startSpeed: 12 })).toBe("출발 대시 +43km/h");
    expect(perkLabel({})).toBe("");
  });
});
