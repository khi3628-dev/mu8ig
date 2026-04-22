const MYR = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
});

export function senToMyr(sen: number): string {
  return MYR.format(sen / 100);
}

export function myrToSen(myr: number): number {
  return Math.round(myr * 100);
}
