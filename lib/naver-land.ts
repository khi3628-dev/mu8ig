import type {
  NaverComplex,
  NaverArticle,
  ComplexArticleResponse,
  Listing,
} from "./types";

const BASE_URL = "https://new.land.naver.com/api";

// 서울 강동구 법정동 코드
const GANGDONG_GU_CODE = "1174000000";

// 84m² 필터 범위 (전용면적 기준, 약간의 오차 허용)
const AREA_MIN = 80;
const AREA_MAX = 89;

const HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Referer: "https://new.land.naver.com/complexes",
};

async function fetchWithRetry(
  url: string,
  retries = 3,
  delay = 1000
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { headers: HEADERS });
      if (response.ok) return response;
      if (response.status === 429 || response.status >= 500) {
        await new Promise((r) => setTimeout(r, delay * (i + 1)));
        continue;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((r) => setTimeout(r, delay * (i + 1)));
    }
  }
  throw new Error("Max retries exceeded");
}

/**
 * 강동구 내 아파트 단지 목록 조회
 */
export async function getComplexes(): Promise<NaverComplex[]> {
  const url = `${BASE_URL}/regions/complexes?cortarNo=${GANGDONG_GU_CODE}&realEstateType=APT&order=`;
  const response = await fetchWithRetry(url);
  const data = await response.json();
  return data.complexList || [];
}

export type TradeTypeCode = "A1" | "B1" | "B2"; // A1: 매매, B1: 전세, B2: 월세

function toCoord(value: number | string | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * 목록 API가 좌표를 주지 않는 단지에 한해 상세 API로 위/경도 보강
 */
async function fillMissingCoords(
  complexes: NaverComplex[]
): Promise<NaverComplex[]> {
  const missing = complexes.filter(
    (c) => toCoord(c.latitude) === null || toCoord(c.longitude) === null
  );
  if (missing.length === 0) return complexes;

  const resolved = new Map<string, { lat: number; lng: number }>();
  const BATCH_SIZE = 5;

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (complex) => {
        try {
          const response = await fetchWithRetry(
            `${BASE_URL}/complexes/${complex.complexNo}?sameAddressGroup=true`
          );
          const data = await response.json();
          const detail = data.complexDetail || {};
          const lat = toCoord(detail.latitude);
          const lng = toCoord(detail.longitude);
          if (lat !== null && lng !== null) {
            resolved.set(complex.complexNo, { lat, lng });
          }
        } catch {
          console.error(`Failed to fetch coords for complex ${complex.complexName}`);
        }
      })
    );

    if (i + BATCH_SIZE < missing.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return complexes.map((complex) => {
    const found = resolved.get(complex.complexNo);
    return found
      ? { ...complex, latitude: found.lat, longitude: found.lng }
      : complex;
  });
}

/**
 * 매물 조회 조건. 생략하면 전체 크롤링과 동일한 기본값(84m², 가격 무제한)이 쓰인다.
 */
export interface ArticleQuery {
  areaMin?: number;
  areaMax?: number;
  priceMin?: number;
  priceMax?: number;
}

const DEFAULT_QUERY: Required<ArticleQuery> = {
  areaMin: AREA_MIN,
  areaMax: AREA_MAX,
  priceMin: 0,
  priceMax: 900000000,
};

/**
 * 특정 단지의 매물 목록 한 페이지 조회
 */
export async function getArticlesForComplex(
  complexNo: string,
  tradeType: TradeTypeCode = "A1",
  page = 1,
  query: ArticleQuery = {}
): Promise<ComplexArticleResponse> {
  const { areaMin, areaMax, priceMin, priceMax } = { ...DEFAULT_QUERY, ...query };

  const params = new URLSearchParams({
    realEstateType: "APT",
    tradeType,
    tag: "::::::::",
    rentPriceMin: "0",
    rentPriceMax: "900000000",
    priceMin: priceMin.toString(),
    priceMax: priceMax.toString(),
    areaMin: areaMin.toString(),
    areaMax: areaMax.toString(),
    showArticle: "false",
    sameAddressGroup: "true",
    type: "list",
    order: "rank",
    page: page.toString(),
    complexNo,
  });

  const url = `${BASE_URL}/articles/complex/${complexNo}?${params.toString()}`;
  const response = await fetchWithRetry(url);
  const data = await response.json();

  return {
    articleList: data.articleList || [],
    isMoreData: data.isMoreData || false,
    pageSize: data.pageSize || 0,
  };
}

/**
 * 특정 단지의 매물을 페이지 끝까지 조회.
 * 전체 크롤링과 관심 단지 감시가 같이 쓰는 경로다.
 */
export async function getAllArticlesForComplex(
  complexNo: string,
  tradeType: TradeTypeCode = "A1",
  query: ArticleQuery = {}
): Promise<NaverArticle[]> {
  const articles: NaverArticle[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await getArticlesForComplex(
      complexNo,
      tradeType,
      page,
      query
    );
    articles.push(...result.articleList);
    hasMore = result.isMoreData;
    page++;
  }

  return articles;
}

/**
 * NaverArticle을 Listing 형식으로 변환
 */
function toListingItem(
  article: NaverArticle,
  complex: NaverComplex
): Listing {
  return {
    id: article.articleNo,
    complexNo: complex.complexNo,
    complexName: complex.complexName,
    address: complex.cortarAddress + " " + (complex.detailAddress || ""),
    latitude: toCoord(complex.latitude),
    longitude: toCoord(complex.longitude),
    tradeType: article.tradeTypeName,
    price: article.dealOrWarrantPrc,
    rentPrice: article.rentPrc || 0,
    supplyArea: article.area1,
    exclusiveArea: article.area2,
    floor: article.floorInfo,
    direction: article.direction,
    confirmedDate: article.articleConfirmYmd,
    description: article.articleFeatureDesc || "",
    buildingName: article.buildingName || "",
    realtorName: article.realtorName || "",
  };
}

export type TradeTypeFilter = "all" | "sell" | "jeonse" | "monthly";

const TRADE_TYPE_MAP: Record<TradeTypeFilter, TradeTypeCode[]> = {
  all: ["A1", "B1", "B2"],
  sell: ["A1"],
  jeonse: ["B1"],
  monthly: ["B2"],
};

/**
 * 강동구 84m² 전체 매물 크롤링
 */
export async function scrapeGangdongListings(
  tradeTypeFilter: TradeTypeFilter = "all"
): Promise<Listing[]> {
  const complexes = await fillMissingCoords(await getComplexes());
  const listings: Listing[] = [];
  const tradeTypes = TRADE_TYPE_MAP[tradeTypeFilter];

  // 단지별로 매물 조회 (동시 요청 수 제한)
  const BATCH_SIZE = 5;

  for (let i = 0; i < complexes.length; i += BATCH_SIZE) {
    const batch = complexes.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.flatMap((complex) =>
        tradeTypes.map(async (tradeType) => {
          try {
            const allArticles = await getAllArticlesForComplex(
              complex.complexNo,
              tradeType
            );

            return allArticles.map((article) =>
              toListingItem(article, complex)
            );
          } catch {
            console.error(
              `Failed to fetch articles for complex ${complex.complexName}`
            );
            return [];
          }
        })
      )
    );

    listings.push(...batchResults.flat());

    // 배치 간 딜레이 (서버 부하 방지)
    if (i + BATCH_SIZE < complexes.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return listings;
}
