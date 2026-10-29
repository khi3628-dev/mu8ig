import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CATALOG, type ItemId } from "@/lib/boat/paradise";
import { TRACK_HALF, createCourse } from "@/lib/boat/race";
import { PLAYER_STYLE, createItemModel, createJetSki } from "./models";
import { chop, createHop, stepHop } from "./bounce";
import { boundaryPoints } from "./track";
import { waveHeight } from "./water";

describe("3D 모델", () => {
  it("모든 시설 모델이 한 칸(1×1) 안에 들어온다", () => {
    for (const id of Object.keys(CATALOG) as ItemId[]) {
      const size = new THREE.Box3().setFromObject(createItemModel(id), true).getSize(new THREE.Vector3());
      expect(size.x, `${id} x`).toBeGreaterThan(0.1);
      expect(size.x, `${id} x`).toBeLessThanOrEqual(1.3);
      expect(size.z, `${id} z`).toBeLessThanOrEqual(1.3);
      expect(size.y, `${id} y`).toBeLessThanOrEqual(1.4);
    }
  });

  it("제트스키는 앞(+x)으로 긴 모양이다", () => {
    const { group } = createJetSki(PLAYER_STYLE);
    const size = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
    expect(size.x).toBeGreaterThan(size.z * 2);
  });
});

describe("파도", () => {
  it("높이가 진폭 범위를 넘지 않고 시간에 따라 변한다", () => {
    for (let i = 0; i < 200; i++) {
      expect(Math.abs(waveHeight(i * 7.3, i * 3.1, i * 0.4))).toBeLessThanOrEqual(1.25 * 0.35 + 1e-9);
    }
    expect(Math.abs(waveHeight(10, 10, 0) - waveHeight(10, 10, 2.5))).toBeGreaterThan(0.05);
  });
});

describe("코스 경계 부표", () => {
  const pts = boundaryPoints(createCourse(), TRACK_HALF);

  it("코스 폭만큼 떨어진 곳에 충분한 개수가 놓인다", () => {
    expect(pts.length).toBeGreaterThan(40);
  });

  it("부표는 코스 안쪽 주행 구간을 침범하지 않는다", async () => {
    const { distanceToCourse } = await import("@/lib/boat/race");
    const course = createCourse();
    for (const p of pts) {
      const d = distanceToCourse(course, p.x, p.y);
      expect(d).toBeGreaterThanOrEqual(TRACK_HALF - 0.51);
      expect(d).toBeLessThanOrEqual(TRACK_HALF + 0.01);
    }
  });

  it("부표 사이 간격이 일정 이상 유지된다", () => {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThanOrEqual(14);
      }
    }
  });
});

describe("통통 튀는 연출", () => {
  const ride = (v: number, seconds = 20) => {
    const h = createHop();
    const dt = 1 / 60;
    let air = 0, lands = 0, below = false;
    for (let i = 0; i < seconds / dt; i++) {
      const t = i * dt, x = v * t, z = 0.3 * v * t;
      const surf = waveHeight(x, z, t) + chop(x, z, t);
      if (stepHop(h, surf, dt, v / 30) > 0) lands++;
      if (h.airborne) air++;
      if (h.y < surf - 1e-9) below = true;
    }
    return { airRatio: (air * dt) / seconds, lands, below };
  };

  it("멈춰 있으면 튀지 않고 물에 떠 있다", () => {
    expect(ride(0)).toMatchObject({ airRatio: 0, lands: 0 });
  });

  it("보통 속도부터 파도 리듬에 맞춰 계속 통통 튄다", () => {
    const mid = ride(20, 20);
    expect(mid.lands / 20).toBeGreaterThan(1.5); // 착수 충격이 있는 튐만 세서 초당 1.5번 이상
    const top = ride(30, 20);
    expect(top.lands / 20).toBeGreaterThan(1.5);
    expect(top.airRatio).toBeGreaterThan(0.5);
    expect(top.airRatio).toBeLessThan(0.95); // 계속 떠 있지는 않고 착수한다
  });

  it("어떤 속도에서도 수면 아래로 파고들지 않는다", () => {
    for (const v of [0, 15, 30, 45]) expect(ride(v, 10).below).toBe(false);
  });
});
