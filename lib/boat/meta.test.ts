import { describe, expect, it } from "vitest";
import type { RaceResult } from "./race";
import { NO_PERKS } from "./race";
import {
  DAILY_REWARDS, INTERSTITIAL_EVERY, INTERSTITIAL_GRACE, MISSIONS_PER_DAY, MISSION_POOL, SKINS,
  buySkin, canUse, claimDaily, claimMission, createMeta, dailyAvailable, equipSkin, grantSupporter, interstitialDue,
  loadMeta, markInterstitial, missionDef, missionsFor, nextDailyReward, recordRace, refreshMissions,
} from "./meta";

const result = (over: Partial<RaceResult> = {}): RaceResult => ({
  rank: 4, finished: true, time: 120, prize: 300, fishCoins: 0, caught: [], perks: NO_PERKS,
  run: null, bestBefore: null, standings: [], ...over,
});

describe("스킨 상점", () => {
  it("돈이 있으면 사서 바로 장착하고, 없으면 부족한 금액을 알려 준다", () => {
    const m = createMeta();
    expect(buySkin(m, "ocean", 1000)).toEqual({ error: "500 CR 부족" });
    expect(buySkin(m, "ocean", 2000)).toEqual({ money: 500 });
    expect(m.skin).toBe("ocean");
    expect(buySkin(m, "ocean", 9999)).toEqual({ error: "이미 가진 스킨" });
  });

  it("서포터 전용 스킨은 살 수 없고, 서포터 팩을 받으면 쓸 수 있다", () => {
    const m = createMeta();
    expect("error" in buySkin(m, "royal", 1e9)).toBe(true);
    expect(equipSkin(m, "royal")).not.toBeNull();
    grantSupporter(m);
    expect(equipSkin(m, "royal")).toBeNull();
    expect(m.skin).toBe("royal");
  });

  it("모든 스킨은 id가 겹치지 않고, 기본 스킨만 공짜다", () => {
    expect(new Set(SKINS.map((s) => s.id)).size).toBe(SKINS.length);
    expect(SKINS.filter((s) => !s.supporter && s.price === 0).map((s) => s.id)).toEqual(["classic"]);
  });
});

describe("매일 접속 보상", () => {
  it("하루 한 번만 받고, 연속이면 다음 날 보상이 커진다", () => {
    const m = createMeta();
    expect(claimDaily(m, "2026-11-06")).toBe(DAILY_REWARDS[0]);
    expect(claimDaily(m, "2026-11-06")).toBe(0);
    expect(dailyAvailable(m, "2026-11-07")).toBe(true);
    expect(nextDailyReward(m, "2026-11-07")).toEqual({ day: 2, amount: DAILY_REWARDS[1] });
    expect(claimDaily(m, "2026-11-07")).toBe(DAILY_REWARDS[1]);
  });

  it("하루라도 빠지면 1일차로 돌아가고, 7일을 넘으면 다시 1일차 보상부터 돈다", () => {
    const m = createMeta();
    claimDaily(m, "2026-11-01");
    claimDaily(m, "2026-11-02");
    expect(claimDaily(m, "2026-11-04")).toBe(DAILY_REWARDS[0]);
    for (let d = 5; d <= 10; d++) claimDaily(m, `2026-11-${String(d).padStart(2, "0")}`);
    expect(m.streak).toBe(7);
    expect(claimDaily(m, "2026-11-11")).toBe(DAILY_REWARDS[0]);
  });

  it("월말을 넘어가도 연속으로 친다", () => {
    const m = createMeta();
    claimDaily(m, "2026-10-31");
    expect(claimDaily(m, "2026-11-01")).toBe(DAILY_REWARDS[1]);
  });
});

describe("일일 미션", () => {
  it("날짜마다 서로 다른 미션 3개가 정해지고, 같은 날이면 항상 같다", () => {
    const a = missionsFor("2026-11-06");
    expect(a).toHaveLength(MISSIONS_PER_DAY);
    expect(new Set(a).size).toBe(MISSIONS_PER_DAY);
    expect(missionsFor("2026-11-06")).toEqual(a);
    const seen = new Set<string>();
    for (let d = 1; d <= 28; d++) missionsFor(`2026-11-${String(d).padStart(2, "0")}`).forEach((k) => seen.add(k));
    expect(seen.size).toBe(MISSION_POOL.length); // 한 달이면 모든 종류가 나온다
  });

  it("레이스 결과로 진행되고, 달성하면 한 번만 보상을 받는다", () => {
    const m = createMeta();
    m.missionDay = "2026-11-06";
    m.missions = [
      { kind: "fish", progress: 0, claimed: false },
      { kind: "win", progress: 0, claimed: false },
      { kind: "races", progress: 0, claimed: false },
    ];
    expect(claimMission(m, "fish")).toBe(0);
    expect(recordRace(m, result({ caught: [0, 1, 1, 2] }), "2026-11-06")).toEqual([]);
    expect(recordRace(m, result({ rank: 1, caught: [0, 3] }), "2026-11-06")).toEqual(["fish", "win"]);
    expect(m.missions[0].progress).toBe(missionDef("fish").target);
    expect(claimMission(m, "fish")).toBe(missionDef("fish").reward);
    expect(claimMission(m, "fish")).toBe(0);
  });

  it("시간 초과로 끝나면 완주·순위 미션은 오르지 않는다", () => {
    const m = createMeta();
    m.missionDay = "d";
    m.missions = [
      { kind: "races", progress: 0, claimed: false },
      { kind: "podium", progress: 0, claimed: false },
      { kind: "win", progress: 0, claimed: false },
    ];
    recordRace(m, result({ rank: 1, finished: false }), "d");
    expect(m.missions.map((x) => x.progress)).toEqual([0, 0, 0]);
  });

  it("베스트 기록 미션은 이전 기록보다 빨라야 오른다", () => {
    const m = createMeta();
    m.missionDay = "d";
    m.missions = [{ kind: "record", progress: 0, claimed: false }, { kind: "races", progress: 0, claimed: false }, { kind: "fish", progress: 0, claimed: false }];
    const run = { time: 100, dt: 0.2, points: [], splits: [] };
    recordRace(m, result({ run, bestBefore: null }), "d"); // 첫 기록은 갈아치운 게 아니다
    expect(m.missions[0].progress).toBe(0);
    recordRace(m, result({ run, bestBefore: 101 }), "d");
    expect(m.missions[0].progress).toBe(1);
  });

  it("날짜가 바뀌면 진행이 초기화된 새 미션으로 바뀐다", () => {
    const m = createMeta();
    refreshMissions(m, "2026-11-06");
    m.missions[0].progress = 1;
    refreshMissions(m, "2026-11-07");
    expect(m.missionDay).toBe("2026-11-07");
    expect(m.missions.every((x) => x.progress === 0 && !x.claimed)).toBe(true);
  });
});

describe("광고 빈도", () => {
  it("처음 몇 판은 광고 없이, 그다음부터 정해진 판수마다, 서포터는 아예 없음", () => {
    const m = createMeta();
    const play = () => recordRace(m, result(), "d");
    for (let i = 0; i < INTERSTITIAL_GRACE; i++) {
      play();
      expect(interstitialDue(m)).toBe(false);
    }
    play();
    expect(interstitialDue(m)).toBe(m.racesSinceAd >= INTERSTITIAL_EVERY);
    markInterstitial(m);
    expect(interstitialDue(m)).toBe(false);
    for (let i = 0; i < INTERSTITIAL_EVERY; i++) play();
    expect(interstitialDue(m)).toBe(true);
    grantSupporter(m);
    expect(interstitialDue(m)).toBe(false);
  });
});

describe("저장 불러오기", () => {
  it("깨진 저장·없는 값은 기본값으로 메우고, 쓸 수 없는 스킨은 기본으로 되돌린다", () => {
    expect(loadMeta(null)).toEqual(createMeta());
    expect(loadMeta("{oops")).toEqual(createMeta());
    const m = loadMeta(JSON.stringify({ skin: "royal", owned: ["ocean", "nope"], streak: -3, settings: { music: 5, sfx: 0.3 } }));
    expect(m.skin).toBe("classic"); // royal은 서포터 전용
    expect(m.owned).toEqual(["classic", "ocean"]);
    expect(m.streak).toBe(0);
    expect(m.settings).toEqual({ music: 0.8, sfx: 0.3 });
    expect(canUse(m, "ocean")).toBe(true);
  });

  it("저장했다 다시 불러오면 같다", () => {
    const m = createMeta();
    buySkin(m, "carbon", 5000);
    claimDaily(m, "2026-11-06");
    refreshMissions(m, "2026-11-06");
    expect(loadMeta(JSON.stringify(m))).toEqual(m);
  });
});
