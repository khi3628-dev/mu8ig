const KRW = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

export function formatWon(won: number): string {
  return KRW.format(won);
}

export function formatWonCompact(won: number): string {
  if (won >= 10000) {
    const man = won / 10000;
    const rounded = Math.round(man * 10) / 10;
    return `${rounded}만원`;
  }
  return formatWon(won);
}
