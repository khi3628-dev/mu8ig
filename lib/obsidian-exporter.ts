import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { Listing } from "./types";

/**
 * 매물 데이터를 Obsidian 볼트에 마크다운 파일로 저장
 *
 * 저장 구조:
 *   {vaultPath}/부동산/
 *     ├── 강동구-84m2-2026-04-10.md       (일별 요약 노트)
 *     └── 매물/
 *         ├── 래미안강동팰리스-매매-12345.md  (개별 매물 노트)
 *         └── ...
 */

function formatDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toISOString().split("T")[0];
}

function formatTime(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function formatPriceText(listing: Listing): string {
  if (listing.tradeType === "월세") {
    return `${listing.price} / ${listing.rentPrice}만`;
  }
  return listing.price;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

/**
 * 개별 매물 마크다운 생성
 */
function buildListingMarkdown(listing: Listing, dateStr: string): string {
  const lines: string[] = [];

  // YAML Frontmatter (Obsidian Properties)
  lines.push("---");
  lines.push(`id: "${listing.id}"`);
  lines.push(`단지명: "${listing.complexName}"`);
  lines.push(`주소: "${listing.address}"`);
  lines.push(`거래유형: "${listing.tradeType}"`);
  lines.push(`가격: "${formatPriceText(listing)}"`);
  lines.push(`전용면적: ${listing.exclusiveArea}`);
  lines.push(`공급면적: ${listing.supplyArea}`);
  lines.push(`층: "${listing.floor}"`);
  lines.push(`방향: "${listing.direction}"`);
  lines.push(`확인일: "${listing.confirmedDate}"`);
  lines.push(`중개사: "${listing.realtorName}"`);
  lines.push(`동: "${listing.buildingName}"`);
  lines.push(`수집일: "${dateStr}"`);
  lines.push("tags:");
  lines.push("  - 부동산");
  lines.push("  - 강동구");
  lines.push("  - 84m2");
  lines.push(`  - ${listing.tradeType}`);
  lines.push("---");
  lines.push("");

  // 본문
  lines.push(`# ${listing.complexName} - ${listing.tradeType}`);
  lines.push("");
  lines.push(`| 항목 | 내용 |`);
  lines.push(`| --- | --- |`);
  lines.push(`| 단지명 | ${listing.complexName} |`);
  lines.push(`| 주소 | ${listing.address} |`);
  lines.push(`| 거래유형 | ${listing.tradeType} |`);
  lines.push(`| 가격 | ${formatPriceText(listing)} |`);
  lines.push(`| 전용면적 | ${listing.exclusiveArea}m² |`);
  lines.push(`| 공급면적 | ${listing.supplyArea}m² |`);
  lines.push(`| 층 | ${listing.floor} |`);
  lines.push(`| 방향 | ${listing.direction} |`);
  lines.push(`| 동 | ${listing.buildingName} |`);
  lines.push(`| 확인일 | ${listing.confirmedDate} |`);
  lines.push(`| 중개사 | ${listing.realtorName} |`);
  lines.push("");

  if (listing.description) {
    lines.push("## 매물 설명");
    lines.push("");
    lines.push(listing.description);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * 일별 요약 마크다운 생성
 */
function buildDailySummaryMarkdown(
  listings: Listing[],
  scrapedAt: string,
  tradeType: string
): string {
  const dateStr = formatDate(scrapedAt);
  const timeStr = formatTime(scrapedAt);
  const lines: string[] = [];

  // YAML Frontmatter
  lines.push("---");
  lines.push(`수집일: "${dateStr}"`);
  lines.push(`수집시각: "${timeStr}"`);
  lines.push(`지역: "서울 강동구"`);
  lines.push(`면적: "84m²"`);
  lines.push(`거래유형필터: "${tradeType}"`);
  lines.push(`총매물수: ${listings.length}`);
  lines.push("tags:");
  lines.push("  - 부동산");
  lines.push("  - 강동구");
  lines.push("  - 일별보고서");
  lines.push("---");
  lines.push("");

  lines.push(`# 강동구 84m² 매물 현황 (${dateStr})`);
  lines.push("");
  lines.push(`> 수집 시각: ${timeStr} | 총 ${listings.length}건`);
  lines.push("");

  // 거래유형별 통계
  const sellCount = listings.filter((l) => l.tradeType === "매매").length;
  const jeonseCount = listings.filter((l) => l.tradeType === "전세").length;
  const monthlyCount = listings.filter((l) => l.tradeType === "월세").length;

  lines.push("## 통계");
  lines.push("");
  lines.push(`| 거래유형 | 건수 |`);
  lines.push(`| --- | --- |`);
  lines.push(`| 매매 | ${sellCount}건 |`);
  lines.push(`| 전세 | ${jeonseCount}건 |`);
  lines.push(`| 월세 | ${monthlyCount}건 |`);
  lines.push(`| **합계** | **${listings.length}건** |`);
  lines.push("");

  // 단지별 그룹핑
  const byComplex = new Map<string, Listing[]>();
  for (const listing of listings) {
    const group = byComplex.get(listing.complexName) || [];
    group.push(listing);
    byComplex.set(listing.complexName, group);
  }

  lines.push("## 매물 목록");
  lines.push("");

  lines.push(
    `| 단지명 | 거래 | 가격 | 전용면적 | 층 | 방향 | 확인일 | 상세 |`
  );
  lines.push(
    `| --- | --- | --- | --- | --- | --- | --- | --- |`
  );

  for (const listing of listings) {
    const fileName = sanitizeFileName(
      `${listing.complexName}-${listing.tradeType}-${listing.id}`
    );
    const link = `[[매물/${fileName}]]`;
    lines.push(
      `| ${listing.complexName} | ${listing.tradeType} | ${formatPriceText(listing)} | ${listing.exclusiveArea}m² | ${listing.floor} | ${listing.direction} | ${listing.confirmedDate} | ${link} |`
    );
  }

  lines.push("");
  return lines.join("\n");
}

export interface ExportResult {
  summaryFile: string;
  listingFiles: string[];
  totalFiles: number;
}

/**
 * 매물 데이터를 Obsidian 볼트에 마크다운으로 내보내기
 */
export async function exportToObsidian(
  vaultPath: string,
  listings: Listing[],
  scrapedAt: string,
  tradeType: string
): Promise<ExportResult> {
  const baseDir = path.join(vaultPath, "부동산");
  const listingDir = path.join(baseDir, "매물");
  const dateStr = formatDate(scrapedAt);

  // 디렉토리 생성
  await mkdir(listingDir, { recursive: true });

  // 일별 요약 노트 저장
  const summaryContent = buildDailySummaryMarkdown(
    listings,
    scrapedAt,
    tradeType
  );
  const summaryFileName = `강동구-84m2-${dateStr}.md`;
  const summaryFilePath = path.join(baseDir, summaryFileName);
  await writeFile(summaryFilePath, summaryContent, "utf-8");

  // 개별 매물 노트 저장
  const listingFiles: string[] = [];
  for (const listing of listings) {
    const content = buildListingMarkdown(listing, dateStr);
    const fileName =
      sanitizeFileName(
        `${listing.complexName}-${listing.tradeType}-${listing.id}`
      ) + ".md";
    const filePath = path.join(listingDir, fileName);
    await writeFile(filePath, content, "utf-8");
    listingFiles.push(fileName);
  }

  return {
    summaryFile: summaryFileName,
    listingFiles,
    totalFiles: 1 + listingFiles.length,
  };
}
