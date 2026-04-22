// Crypto-backed random helpers used by Quick Pick.
// Falls back to Math.random when crypto is unavailable (SSR edge cases).

function randInt(maxExclusive: number): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

export function quickPickDigits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += String(randInt(10));
  return s;
}

export function quickPickNumbers(poolSize: number, count: number): number[] {
  const pool = Array.from({ length: poolSize }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}
