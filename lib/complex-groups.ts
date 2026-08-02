import type { Listing } from "./types";
import { parsePriceToManwon } from "./price";

export interface ComplexGroup {
  complexNo: string;
  complexName: string;
  address: string;
  latitude: number;
  longitude: number;
  listings: Listing[];
  /** 핀에 띄울 대표 매물 (해당 단지 최저가) */
  representative: Listing;
  /** 대표 매물 가격 (만원). 파싱 실패 시 null */
  representativePriceManwon: number | null;
}

/**
 * 매물 목록을 단지 단위로 묶어 지도 핀 데이터로 변환한다.
 * 좌표가 없는 단지는 지도에 찍을 수 없으므로 제외된다.
 */
export function groupListingsByComplex(listings: Listing[]): ComplexGroup[] {
  const buckets = new Map<string, Listing[]>();

  for (const listing of listings) {
    if (listing.latitude === null || listing.longitude === null) continue;
    const key = listing.complexNo || `${listing.complexName}|${listing.address}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(listing);
    } else {
      buckets.set(key, [listing]);
    }
  }

  const groups: ComplexGroup[] = [];

  for (const bucket of buckets.values()) {
    // 최저가를 대표로. 가격 파싱이 안 되는 매물만 있으면 첫 매물을 쓴다.
    let representative = bucket[0];
    let lowest: number | null = parsePriceToManwon(representative.price);

    for (const listing of bucket.slice(1)) {
      const priced = parsePriceToManwon(listing.price);
      if (priced === null) continue;
      if (lowest === null || priced < lowest) {
        lowest = priced;
        representative = listing;
      }
    }

    groups.push({
      complexNo: representative.complexNo,
      complexName: representative.complexName,
      address: representative.address,
      latitude: representative.latitude as number,
      longitude: representative.longitude as number,
      listings: bucket,
      representative,
      representativePriceManwon: lowest,
    });
  }

  return groups;
}

/** 좌표가 없어 지도에 표시할 수 없는 매물 수 */
export function countUnmappable(listings: Listing[]): number {
  return listings.filter((l) => l.latitude === null || l.longitude === null)
    .length;
}
