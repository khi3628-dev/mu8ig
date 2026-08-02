import { prisma } from "@/lib/db";
import {
  getAllArticlesForComplex,
  type TradeTypeCode,
} from "@/lib/naver-land";
import { parsePriceToManwon } from "@/lib/price";
import { formatNewListingMessage, sendTelegram } from "@/lib/notify/telegram";
import {
  matchesWatch,
  selectNewArticles,
  TRADE_TYPE_LABELS,
  type WatchCriteria,
} from "@/lib/watch/match";
import type { NaverArticle } from "@/lib/types";

export {
  matchesWatch,
  selectNewArticles,
  TRADE_TYPE_LABELS,
  type WatchCriteria,
};

export interface CheckResult {
  watchId: string;
  complexName: string;
  matched: number;
  fresh: number;
  notified: number;
  seeded: boolean;
  errors: string[];
}

export interface CheckOptions {
  /**
   * 알림 없이 현재 매물을 전부 "본 것"으로 기록만 한다.
   * 관심 단지를 새로 등록한 직후에 쓴다 — 안 그러면 기존 매물이 한꺼번에 날아온다.
   *
   * 생략하면 watch.seededAt으로 판단한다. 등록 직후 시딩이 실패(네이버 오류 등)해도
   * 다음 주기에 다시 시딩으로 처리돼서, 기존 매물이 신규로 오인돼 알림이
   * 쏟아지는 일을 막는다.
   */
  seedOnly?: boolean;
}

export async function checkWatch(
  watch: WatchCriteria,
  options: CheckOptions = {}
): Promise<CheckResult> {
  const seedOnly = options.seedOnly ?? !watch.seededAt;
  const errors: string[] = [];

  const articles = await getAllArticlesForComplex(
    watch.complexNo,
    watch.tradeType as TradeTypeCode,
    {
      // 면적은 네이버 쪽에서 걸러 받고, 가격은 응답 문자열을 파싱해 직접 판정한다
      // (네이버 가격 파라미터의 단위 동작에 의존하지 않기 위해).
      ...(watch.areaMinM2 !== null ? { areaMin: watch.areaMinM2 } : {}),
      ...(watch.areaMaxM2 !== null ? { areaMax: watch.areaMaxM2 } : {}),
    }
  );

  const matched = articles.filter((article) => matchesWatch(article, watch));

  const seenRows = await prisma.seenArticle.findMany({
    where: { watchId: watch.id },
    select: { articleNo: true },
  });
  const seen = new Set(seenRows.map((row) => row.articleNo));
  const fresh = selectNewArticles(matched, seen);

  // 시딩이면 알림 없이 전부 기록. 아니면 발송에 성공한 것만 기록해서,
  // 실패한 매물은 다음 주기에 다시 시도되게 한다.
  const toPersist: NaverArticle[] = [];
  let notified = 0;

  if (seedOnly) {
    toPersist.push(...fresh);
  } else {
    for (const article of fresh) {
      const result = await sendTelegram(
        formatNewListingMessage({
          complexName: watch.complexName,
          tradeTypeLabel:
            TRADE_TYPE_LABELS[watch.tradeType as TradeTypeCode] ??
            watch.tradeType,
          price: article.dealOrWarrantPrc,
          rentPrice: article.rentPrc,
          exclusiveArea: article.area2,
          floor: article.floorInfo,
          direction: article.direction,
          confirmedDate: article.articleConfirmYmd,
          description: article.articleFeatureDesc,
        })
      );

      if (result.ok) {
        toPersist.push(article);
        notified++;
      } else if (result.error) {
        errors.push(`${article.articleNo}: ${result.error}`);
      }
    }
  }

  if (toPersist.length > 0) {
    await prisma.seenArticle.createMany({
      data: toPersist.map((article) => ({
        watchId: watch.id,
        articleNo: article.articleNo,
        priceManwon: parsePriceToManwon(article.dealOrWarrantPrc),
      })),
      skipDuplicates: true,
    });
  }

  await prisma.watch.update({
    where: { id: watch.id },
    data: {
      lastCheckedAt: new Date(),
      // 시딩이 끝까지 성공한 경우에만 표시한다. 여기까지 왔다는 건
      // 조회·기록이 모두 끝났다는 뜻이다.
      ...(seedOnly ? { seededAt: new Date() } : {}),
    },
  });

  return {
    watchId: watch.id,
    complexName: watch.complexName,
    matched: matched.length,
    fresh: fresh.length,
    notified,
    seeded: seedOnly,
    errors,
  };
}

/**
 * 활성 관심 단지를 순차 처리한다.
 * 병렬로 돌리지 않는 건 네이버 쪽 부하/차단을 피하기 위해서다.
 */
export async function checkAllWatches(): Promise<CheckResult[]> {
  const watches = await prisma.watch.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });

  const results: CheckResult[] = [];

  for (const [index, watch] of watches.entries()) {
    try {
      results.push(await checkWatch(watch));
    } catch (error) {
      results.push({
        watchId: watch.id,
        complexName: watch.complexName,
        matched: 0,
        fresh: 0,
        notified: 0,
        seeded: false,
        errors: [String(error)],
      });
    }

    if (index < watches.length - 1) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  return results;
}
