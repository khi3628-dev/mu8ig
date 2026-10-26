import { describe, expect, it } from "vitest";
import {
  attack, buildOrRepair, createGame, drink, eat, key, throwHook, update, TILE_HP,
} from "./game";

const still = { dx: 0, dy: 0 };

describe("boat survival", () => {
  it("플레이어는 뗏목 밖으로 나갈 수 없다", () => {
    const s = createGame();
    for (let i = 0; i < 100; i++) update(s, 0.1, { dx: 1, dy: 0 }, () => 0.99);
    expect(s.player.x).toBeLessThan(1);
  });

  it("인접한 바다 칸에 재료를 써서 뗏목을 짓는다", () => {
    const s = createGame();
    buildOrRepair(s, 1.5, 0.5);
    expect(s.raft.has(key(1, 0))).toBe(true);
    expect(s.inv.plank).toBe(2);
    expect(s.inv.plastic).toBe(1);
  });

  it("떨어진 칸에는 지을 수 없다", () => {
    const s = createGame();
    s.player = { x: 0.5, y: 0.5 };
    buildOrRepair(s, 2.5, 0.5);
    expect(s.raft.has(key(2, 0))).toBe(false);
    expect(s.inv.plank).toBe(4);
  });

  it("손상된 칸을 판자 1개로 수리한다", () => {
    const s = createGame();
    s.raft.set(key(0, 0), 1);
    buildOrRepair(s, 0.5, 0.5);
    expect(s.raft.get(key(0, 0))).toBe(TILE_HP);
    expect(s.inv.plank).toBe(3);
  });

  it("갈고리가 경로상의 부유물을 회수한다", () => {
    const s = createGame();
    s.spawnTimer = 999;
    s.debris.push({ id: 99, kind: "barrel", x: 0, y: -3 });
    throwHook(s, 0, -5);
    for (let i = 0; i < 50 && s.hook; i++) update(s, 0.02, still);
    expect(s.hook).toBeNull();
    expect(s.inv.plank).toBe(7);
    expect(s.debris).toHaveLength(0);
  });

  it("먹고 마시면 수치가 회복되고 아이템이 줄어든다", () => {
    const s = createGame();
    s.hunger = 10;
    s.thirst = 10;
    eat(s);
    drink(s);
    expect(s.hunger).toBe(40);
    expect(s.thirst).toBe(45);
    expect(s.inv.food).toBe(0);
    expect(s.inv.water).toBe(0);
  });

  it("굶주림과 갈증이 바닥나면 결국 게임 오버", () => {
    const s = createGame();
    s.hunger = 0;
    for (let i = 0; i < 600 && !s.over; i++) update(s, 0.1, still, () => 0.99);
    expect(s.over).toBe(true);
  });

  it("상어는 가장자리 칸을 물어뜯어 부수고, 창으로 쫓아낼 수 있다", () => {
    const s = createGame();
    s.spawnTimer = 999;
    s.inv.food = 999;
    s.inv.water = 999;
    let destroyed = false;
    for (let i = 0; i < 2000 && !destroyed; i++) {
      update(s, 0.05, still, () => 0);
      if (s.hunger < 50) eat(s);
      if (s.thirst < 50) drink(s);
      destroyed = s.raft.size < 4;
    }
    expect(destroyed).toBe(true);

    s.shark.x = s.player.x + 1;
    s.shark.y = s.player.y;
    attack(s);
    expect(s.shark.mode).toBe("flee");
    expect(s.shark.hp).toBe(2);
  });
});
