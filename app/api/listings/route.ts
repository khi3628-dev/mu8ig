import { NextRequest, NextResponse } from "next/server";
import {
  scrapeGangdongListings,
  type TradeTypeFilter,
} from "@/lib/naver-land";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tradeType = (searchParams.get("tradeType") || "all") as TradeTypeFilter;

  const validTradeTypes: TradeTypeFilter[] = [
    "all",
    "sell",
    "jeonse",
    "monthly",
  ];
  if (!validTradeTypes.includes(tradeType)) {
    return NextResponse.json(
      { error: "Invalid tradeType. Use: all, sell, jeonse, monthly" },
      { status: 400 }
    );
  }

  try {
    const listings = await scrapeGangdongListings(tradeType);

    return NextResponse.json({
      region: "서울 강동구",
      areaFilter: "84m² (전용면적 80~89m²)",
      tradeType,
      total: listings.length,
      scrapedAt: new Date().toISOString(),
      listings,
    });
  } catch (error) {
    console.error("Scraping failed:", error);

    // 상류 실패 원인을 그대로 내려준다 (자격증명은 포함되지 않는다).
    // 감추면 배포 환경에서 네이버 차단인지 다른 문제인지 구분할 수 없다.
    const detail = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: `매물을 가져오지 못했습니다. (${detail})` },
      { status: 502 }
    );
  }
}
