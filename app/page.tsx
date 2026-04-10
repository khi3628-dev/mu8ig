"use client";

import { useState } from "react";
import type { Listing } from "@/lib/types";

type TradeTypeFilter = "all" | "sell" | "jeonse" | "monthly";

interface ApiResponse {
  region: string;
  areaFilter: string;
  tradeType: string;
  total: number;
  scrapedAt: string;
  listings: Listing[];
}

const TRADE_TYPE_LABELS: Record<TradeTypeFilter, string> = {
  all: "전체",
  sell: "매매",
  jeonse: "전세",
  monthly: "월세",
};

function formatPrice(price: string, rentPrice: number, tradeType: string) {
  if (tradeType === "월세") {
    return `${price} / ${rentPrice}만`;
  }
  return `${price}`;
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tradeType, setTradeType] = useState<TradeTypeFilter>("all");
  const [scrapedAt, setScrapedAt] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const handleScrape = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/listings?tradeType=${tradeType}`);
      if (!response.ok) {
        throw new Error("크롤링 요청에 실패했습니다.");
      }
      const data: ApiResponse = await response.json();
      setListings(data.listings);
      setTotal(data.total);
      setScrapedAt(data.scrapedAt);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            서울 강동구 84m² 부동산 매물
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            네이버 부동산 기반 실시간 매물 크롤링
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* 필터 & 검색 */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-8">
          <div className="flex gap-2">
            {(
              Object.entries(TRADE_TYPE_LABELS) as [TradeTypeFilter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTradeType(key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  tradeType === key
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-white text-zinc-600 border border-zinc-300 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={handleScrape}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "크롤링 중..." : "매물 검색"}
          </button>

          {scrapedAt && (
            <span className="text-xs text-zinc-400">
              {new Date(scrapedAt).toLocaleString("ko-KR")} 기준 | 총{" "}
              {total}건
            </span>
          )}
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-4 border-zinc-300 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-zinc-500 dark:text-zinc-400">
              강동구 매물을 크롤링하고 있습니다...
            </p>
            <p className="text-xs text-zinc-400">
              단지 수에 따라 1~2분 소요될 수 있습니다.
            </p>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* 결과 없음 */}
        {!loading && !error && listings.length === 0 && !scrapedAt && (
          <div className="text-center py-20">
            <p className="text-zinc-400 dark:text-zinc-500 text-lg">
              &ldquo;매물 검색&rdquo; 버튼을 눌러 크롤링을 시작하세요.
            </p>
          </div>
        )}

        {!loading && !error && listings.length === 0 && scrapedAt && (
          <div className="text-center py-20">
            <p className="text-zinc-400 dark:text-zinc-500 text-lg">
              조건에 맞는 매물이 없습니다.
            </p>
          </div>
        )}

        {/* 매물 목록 */}
        {!loading && listings.length > 0 && (
          <div className="grid gap-4">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${
                          listing.tradeType === "매매"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : listing.tradeType === "전세"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        }`}
                      >
                        {listing.tradeType}
                      </span>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {listing.complexName}
                      </h3>
                      {listing.buildingName && (
                        <span className="text-xs text-zinc-400">
                          {listing.buildingName}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {listing.address}
                    </p>
                    {listing.description && (
                      <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1 line-clamp-1">
                        {listing.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right sm:min-w-48">
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      {formatPrice(
                        listing.price,
                        listing.rentPrice,
                        listing.tradeType
                      )}
                    </p>
                    <div className="flex gap-3 text-xs text-zinc-400 mt-1 justify-end">
                      <span>
                        전용 {listing.exclusiveArea}m²
                      </span>
                      {listing.floor && <span>{listing.floor}층</span>}
                      {listing.direction && <span>{listing.direction}</span>}
                    </div>
                    <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-1">
                      {listing.confirmedDate} | {listing.realtorName}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
