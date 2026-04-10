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
    return NextResponse.json(
      { error: "Failed to scrape listings. Please try again later." },
      { status: 500 }
    );
  }
}
