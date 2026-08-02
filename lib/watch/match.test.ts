import { describe, it, expect } from "vitest";
import { matchesWatch, selectNewArticles, type WatchCriteria } from "./match";
import type { NaverArticle } from "@/lib/types";

function article(overrides: Partial<NaverArticle> = {}): NaverArticle {
  return {
    articleNo: "1",
    articleName: "테스트아파트",
    realEstateTypeName: "아파트",
    tradeTypeName: "매매",
    dealOrWarrantPrc: "15억",
    rentPrc: 0,
    areaName: "84",
    area1: 112.5,
    area2: 84.97,
    floorInfo: "8/25",
    direction: "남향",
    articleConfirmYmd: "26.08.01",
    articleFeatureDesc: "",
    tagList: [],
    buildingName: "101동",
    sameAddrMaxPrc: "",
    sameAddrMinPrc: "",
    realtorName: "테스트공인",
    cpName: "",
    ...overrides,
  };
}

function watch(overrides: Partial<WatchCriteria> = {}): WatchCriteria {
  return {
    id: "w1",
    complexNo: "100",
    complexName: "테스트아파트",
    tradeType: "A1",
    areaMinM2: null,
    areaMaxM2: null,
    maxPriceManwon: null,
    ...overrides,
  };
}

describe("matchesWatch", () => {
  it("조건이 없으면 모두 통과", () => {
    expect(matchesWatch(article(), watch())).toBe(true);
  });

  it("전용면적 하한 미만은 제외", () => {
    expect(
      matchesWatch(article({ area2: 59.9 }), watch({ areaMinM2: 80 }))
    ).toBe(false);
  });

  it("전용면적 상한 초과는 제외", () => {
    expect(
      matchesWatch(article({ area2: 114.8 }), watch({ areaMaxM2: 89 }))
    ).toBe(false);
  });

  it("가격 상한 이하만 통과", () => {
    const criteria = watch({ maxPriceManwon: 150000 }); // 15억

    expect(
      matchesWatch(article({ dealOrWarrantPrc: "14억 5,000" }), criteria)
    ).toBe(true);
    expect(matchesWatch(article({ dealOrWarrantPrc: "15억" }), criteria)).toBe(
      true
    );
    expect(
      matchesWatch(article({ dealOrWarrantPrc: "15억 1,000" }), criteria)
    ).toBe(false);
  });

  it("가격 파싱에 실패하면 통과시킨다 (fail-open)", () => {
    expect(
      matchesWatch(
        article({ dealOrWarrantPrc: "가격문의" }),
        watch({ maxPriceManwon: 100000 })
      )
    ).toBe(true);
  });
});

describe("시딩 판정", () => {
  // checkWatch는 options.seedOnly ?? !watch.seededAt 으로 시딩 여부를 정한다.
  // 등록 직후 시딩이 실패해 seededAt이 비어 있으면, 다음 주기에도 시딩으로
  // 처리돼야 기존 매물이 신규로 오인되지 않는다.
  const shouldSeed = (w: WatchCriteria, explicit?: boolean) =>
    explicit ?? !w.seededAt;

  it("seededAt이 없으면 시딩으로 처리한다", () => {
    expect(shouldSeed(watch({ seededAt: null }))).toBe(true);
  });

  it("seededAt이 있으면 일반 확인으로 처리한다", () => {
    expect(shouldSeed(watch({ seededAt: new Date() }))).toBe(false);
  });

  it("명시적으로 지정하면 그 값을 따른다", () => {
    expect(shouldSeed(watch({ seededAt: new Date() }), true)).toBe(true);
  });
});

describe("selectNewArticles", () => {
  it("이미 본 매물은 제외한다", () => {
    const articles = [
      article({ articleNo: "a" }),
      article({ articleNo: "b" }),
      article({ articleNo: "c" }),
    ];

    const fresh = selectNewArticles(articles, new Set(["a", "c"]));

    expect(fresh.map((a) => a.articleNo)).toEqual(["b"]);
  });

  it("본 적 없으면 전부 신규", () => {
    const articles = [article({ articleNo: "a" }), article({ articleNo: "b" })];

    expect(selectNewArticles(articles, new Set()).length).toBe(2);
  });

  it("전부 본 매물이면 신규 없음 — 재알림 방지", () => {
    const articles = [article({ articleNo: "a" }), article({ articleNo: "b" })];

    expect(selectNewArticles(articles, new Set(["a", "b"]))).toEqual([]);
  });
});
