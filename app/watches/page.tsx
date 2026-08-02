"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TradeTypeCode = "A1" | "B1" | "B2";

const TRADE_TYPE_LABELS: Record<TradeTypeCode, string> = {
  A1: "매매",
  B1: "전세",
  B2: "월세",
};

interface ComplexOption {
  complexNo: string;
  complexName: string;
  address: string;
}

interface Watch {
  id: string;
  complexNo: string;
  complexName: string;
  tradeType: string;
  areaMinM2: number | null;
  areaMaxM2: number | null;
  maxPriceManwon: number | null;
  active: boolean;
  lastCheckedAt: string | null;
  _count?: { seen: number };
}

function formatManwon(manwon: number): string {
  if (manwon >= 10000) {
    const eok = manwon / 10000;
    const rounded = Math.round(eok * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}억`;
  }
  return `${manwon.toLocaleString("ko-KR")}만`;
}

export default function WatchesPage() {
  const [watches, setWatches] = useState<Watch[]>([]);
  const [complexes, setComplexes] = useState<ComplexOption[]>([]);
  const [loadingComplexes, setLoadingComplexes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [complexNo, setComplexNo] = useState("");
  const [tradeType, setTradeType] = useState<TradeTypeCode>("A1");
  const [areaMin, setAreaMin] = useState("80");
  const [areaMax, setAreaMax] = useState("89");
  const [maxPrice, setMaxPrice] = useState("");

  const loadWatches = async () => {
    try {
      const response = await fetch("/api/watches");
      const data = await response.json();
      setWatches(data.watches ?? []);
    } catch {
      setError("관심 단지 목록을 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    loadWatches();
  }, []);

  const loadComplexes = async () => {
    setLoadingComplexes(true);
    setError(null);
    try {
      const response = await fetch("/api/complexes");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setComplexes(data.complexes ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "단지 목록을 불러오지 못했습니다."
      );
    } finally {
      setLoadingComplexes(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const selected = complexes.find((c) => c.complexNo === complexNo);
    if (!selected) {
      setError("단지를 선택해주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/watches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complexNo: selected.complexNo,
          complexName: selected.complexName,
          tradeType,
          areaMinM2: areaMin ? Number(areaMin) : null,
          areaMaxM2: areaMax ? Number(areaMax) : null,
          maxPriceManwon: maxPrice ? Number(maxPrice) : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "등록에 실패했습니다.");

      if (data.seedError) {
        // 등록 자체는 됐지만 기존 매물 기록에 실패한 상태.
        // 다음 확인 주기에 시딩부터 다시 시도되므로 알림이 쏟아지진 않는다.
        setError(
          `${selected.complexName} 등록됨. 다만 기존 매물을 아직 기록하지 못했습니다 — 다음 확인 때 알림 없이 다시 시도합니다. (${data.seedError})`
        );
      } else {
        setNotice(
          `${selected.complexName} 등록 완료. 기존 매물 ${data.seeded}건은 알림 없이 기록했습니다.`
        );
      }
      setComplexNo("");
      await loadWatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (watch: Watch) => {
    await fetch(`/api/watches/${watch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !watch.active }),
    });
    await loadWatches();
  };

  const removeWatch = async (watch: Watch) => {
    await fetch(`/api/watches/${watch.id}`, { method: "DELETE" });
    await loadWatches();
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            관심 단지 알림
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            조건에 맞는 새 매물이 올라오면 텔레그램으로 알려드립니다
          </p>
          <Link
            href="/"
            className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            ← 매물 검색으로
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
        {notice && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <p className="text-green-700 dark:text-green-400 text-sm">
              {notice}
            </p>
          </div>
        )}

        {/* 등록 폼 */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 mb-8"
        >
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            관심 단지 등록
          </h2>

          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <select
              value={complexNo}
              onChange={(e) => setComplexNo(e.target.value)}
              className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            >
              <option value="">
                {complexes.length === 0
                  ? "단지 목록을 먼저 불러오세요"
                  : "단지 선택"}
              </option>
              {complexes.map((complex) => (
                <option key={complex.complexNo} value={complex.complexNo}>
                  {complex.complexName} ({complex.address})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={loadComplexes}
              disabled={loadingComplexes}
              className="px-5 py-2 bg-zinc-900 text-white rounded-full text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 transition-colors"
            >
              {loadingComplexes ? "불러오는 중..." : "단지 목록 불러오기"}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">
              거래유형
              <select
                value={tradeType}
                onChange={(e) => setTradeType(e.target.value as TradeTypeCode)}
                className="mt-1 w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              >
                {(
                  Object.entries(TRADE_TYPE_LABELS) as [TradeTypeCode, string][]
                ).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-zinc-500 dark:text-zinc-400">
              전용면적 하한 (m²)
              <input
                type="number"
                value={areaMin}
                onChange={(e) => setAreaMin(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </label>

            <label className="text-xs text-zinc-500 dark:text-zinc-400">
              전용면적 상한 (m²)
              <input
                type="number"
                value={areaMax}
                onChange={(e) => setAreaMax(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </label>

            <label className="text-xs text-zinc-500 dark:text-zinc-400">
              가격 상한 (만원)
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="예: 150000"
                className="mt-1 w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || !complexNo}
            className="px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "등록 중..." : "알림 등록"}
          </button>
        </form>

        {/* 등록된 관심 단지 */}
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
          등록된 알림 ({watches.length})
        </h2>

        {watches.length === 0 ? (
          <p className="text-sm text-zinc-400 py-8 text-center">
            아직 등록된 관심 단지가 없습니다.
          </p>
        ) : (
          <ul className="grid gap-3">
            {watches.map((watch) => (
              <li
                key={watch.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {watch.complexName}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {TRADE_TYPE_LABELS[watch.tradeType as TradeTypeCode] ??
                        watch.tradeType}
                    </span>
                    {!watch.active && (
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        중지됨
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    전용 {watch.areaMinM2 ?? "-"}~{watch.areaMaxM2 ?? "-"}m²
                    {watch.maxPriceManwon
                      ? ` · ${formatManwon(watch.maxPriceManwon)} 이하`
                      : ""}
                    {` · 기록된 매물 ${watch._count?.seen ?? 0}건`}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {watch.lastCheckedAt
                      ? `마지막 확인 ${new Date(watch.lastCheckedAt).toLocaleString("ko-KR")}`
                      : "아직 확인된 적 없음"}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(watch)}
                    className="px-3 py-1.5 text-xs rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {watch.active ? "중지" : "재개"}
                  </button>
                  <button
                    onClick={() => removeWatch(watch)}
                    className="px-3 py-1.5 text-xs rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
