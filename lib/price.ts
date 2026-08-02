/**
 * 네이버 매물가 문자열 파싱/표시 유틸.
 *
 * 네이버는 가격을 "9억 1,000" / "11억" / "8,000" 같은 문자열로 내려준다.
 * 지도 핀에서 최저가를 고르려면 숫자 비교가 필요하므로 만원 단위 정수로 환산한다.
 */

/** "9억 1,000" -> 91000 (만원). 파싱 불가 시 null */
export function parsePriceToManwon(price: string): number | null {
  if (!price) return null;

  const normalized = price.replace(/,/g, "").trim();
  const eokMatch = normalized.match(/([\d.]+)\s*억/);
  const rest = normalized.replace(/[\d.]+\s*억/, "").trim();

  let total = 0;
  let matched = false;

  if (eokMatch) {
    const eok = Number.parseFloat(eokMatch[1]);
    if (Number.isFinite(eok)) {
      total += eok * 10000;
      matched = true;
    }
  }

  const remainder = Number.parseFloat(rest);
  if (Number.isFinite(remainder)) {
    total += remainder;
    matched = true;
  }

  return matched ? Math.round(total) : null;
}

/** 91000 (만원) -> "9.1억". 1억 미만은 "8,000만" */
export function formatManwonShort(manwon: number): string {
  if (manwon >= 10000) {
    const eok = manwon / 10000;
    const rounded = Math.round(eok * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}억`;
  }
  return `${manwon.toLocaleString("ko-KR")}만`;
}

/** 전용면적(m²) -> 평 (반올림) */
export function toPyeong(squareMeters: number): number {
  return Math.round(squareMeters / 3.3058);
}
