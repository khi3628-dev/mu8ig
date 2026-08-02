/**
 * 감시 조건 매칭 — 순수 로직.
 *
 * DB/네트워크에 의존하지 않게 분리해 두었다. 신규 매물 판정이 이 기능의
 * 핵심 리스크(오탐이면 스팸, 누락이면 기능 무용지물)라 단위 테스트 대상이다.
 */

import { parsePriceToManwon } from "@/lib/price";
import type { NaverArticle } from "@/lib/types";
import type { TradeTypeCode } from "@/lib/naver-land";

export const TRADE_TYPE_LABELS: Record<TradeTypeCode, string> = {
  A1: "매매",
  B1: "전세",
  B2: "월세",
};

/** Watch 레코드에서 매칭에 필요한 필드만 추린 형태 */
export interface WatchCriteria {
  id: string;
  complexNo: string;
  complexName: string;
  tradeType: string;
  areaMinM2: number | null;
  areaMaxM2: number | null;
  maxPriceManwon: number | null;
  /** null이면 아직 시딩되지 않은 관심 단지 */
  seededAt?: Date | null;
}

/**
 * 매물이 감시 조건에 맞는지 판정.
 *
 * 가격 파싱에 실패하면 통과시킨다(fail-open). 네이버 가격 표기가 바뀌어 파싱이
 * 깨졌을 때, 조용히 아무 알림도 안 오는 것보다 과하게 오는 편이 낫다 —
 * 전자는 눈치채기 어렵고 후자는 바로 드러난다.
 */
export function matchesWatch(
  article: NaverArticle,
  watch: WatchCriteria
): boolean {
  if (watch.areaMinM2 !== null && article.area2 < watch.areaMinM2) return false;
  if (watch.areaMaxM2 !== null && article.area2 > watch.areaMaxM2) return false;

  if (watch.maxPriceManwon !== null) {
    const priced = parsePriceToManwon(article.dealOrWarrantPrc);
    if (priced !== null && priced > watch.maxPriceManwon) return false;
  }

  return true;
}

/** 아직 본 적 없는 매물만 추린다 */
export function selectNewArticles(
  articles: NaverArticle[],
  seenArticleNos: Set<string>
): NaverArticle[] {
  return articles.filter((article) => !seenArticleNos.has(article.articleNo));
}
