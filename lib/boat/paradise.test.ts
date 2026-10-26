import { describe, expect, it } from "vitest";
import {
  CATALOG, GRID_W, RECLAIM_COST, applyRaceReward, createSave, level, loadSave, luxury, place, reclaim, sell,
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
});
