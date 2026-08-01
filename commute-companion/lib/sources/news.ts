import { prisma } from "@/lib/db";

const NAVER_ENDPOINT = "https://openapi.naver.com/v1/search/news.json";

export interface FetchedNews {
  topic: string;
  title: string;
  url: string;
  source: string;
  publishedAt: Date;
  snippet: string;
}

const stripHtml = (s: string) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .trim();

const hostname = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
};

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 3,
  delay = 800
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, init);
      if (response.ok) return response;
      if (response.status === 429 || response.status >= 500) {
        await new Promise((r) => setTimeout(r, delay * (i + 1)));
        continue;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((r) => setTimeout(r, delay * (i + 1)));
    }
  }
  throw new Error("Max retries exceeded");
}

/**
 * Fetch the top N news items for a topic via Naver Search OpenAPI,
 * dedupe against the cache, and return the fresh items.
 */
export async function fetchNewsForTopic(
  topic: string,
  query: string,
  display = 10
): Promise<FetchedNews[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "NAVER_CLIENT_ID / NAVER_CLIENT_SECRET are required to fetch news."
    );
  }

  const params = new URLSearchParams({
    query,
    display: String(display),
    sort: "date",
  });
  const url = `${NAVER_ENDPOINT}?${params.toString()}`;

  const response = await fetchWithRetry(url, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
      Accept: "application/json",
    },
  });
  const data = (await response.json()) as {
    items?: Array<{
      title: string;
      link: string;
      originallink: string;
      description: string;
      pubDate: string;
    }>;
  };

  const items: FetchedNews[] = (data.items ?? []).map((raw) => {
    const link = raw.originallink || raw.link;
    return {
      topic,
      title: stripHtml(raw.title),
      url: link,
      source: hostname(link),
      publishedAt: new Date(raw.pubDate),
      snippet: stripHtml(raw.description),
    };
  });

  // Upsert into cache — dedupe on url.
  for (const it of items) {
    await prisma.newsItem.upsert({
      where: { url: it.url },
      update: { fetchedAt: new Date() },
      create: it,
    });
  }

  return items;
}
