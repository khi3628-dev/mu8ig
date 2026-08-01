const buckets = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60_000;
const LIMIT = 20;

export function rateLimit(ip: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now - b.windowStart > WINDOW_MS) {
    buckets.set(ip, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (b.count >= LIMIT) {
    return {
      ok: false,
      retryAfter: Math.ceil((WINDOW_MS - (now - b.windowStart)) / 1000),
    };
  }
  b.count += 1;
  return { ok: true };
}

export function ipFromHeaders(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
