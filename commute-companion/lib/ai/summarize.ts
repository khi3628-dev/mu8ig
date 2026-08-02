import Anthropic from "@anthropic-ai/sdk";
import type { FetchedNews } from "@/lib/sources/news";

// Uses Claude 5 Sonnet with prompt caching on the system message so the
// briefing guidance is cached across every topic in a single generation run.
const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 800;

const SYSTEM_PROMPT = `너는 한국 사무직 직장인의 출퇴근용 뉴스 브리핑 에디터야.
입력으로 특정 토픽의 최근 기사 스니펫 묶음을 받는다.
목표: 통근 3~5분 안에 다 읽을 수 있게, 팩트 위주로 압축한다.

규칙:
- 반드시 유효한 JSON 하나만 응답. 마크다운 코드펜스 금지.
- 스키마: {"title": string, "summary": string, "sourceUrl": string, "source": string}
- title: 15자 내외의 헤드라인 (숫자·이름 우선).
- summary: 3~4문장, 총 200자 내외. 사실만. 감상어(놀랍게도, 충격) 금지.
- sourceUrl/source: 요약의 근거로 가장 대표적인 기사 하나.
- 한국어로 작성. 존댓말 대신 뉴스체.`;

export interface Section {
  topic: string;
  title: string;
  summary: string;
  sourceUrl: string;
  source: string;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : trimmed;
  return JSON.parse(body);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required.");
  client = new Anthropic({ apiKey });
  return client;
}

export async function summarizeTopic(
  topic: string,
  topicLabel: string,
  news: FetchedNews[]
): Promise<Section> {
  if (news.length === 0) {
    return {
      topic,
      title: `${topicLabel} — 오늘 특이사항 없음`,
      summary: "최근 24시간 안에 요약할 만한 신규 이슈가 수집되지 않았습니다.",
      sourceUrl: "",
      source: "",
    };
  }

  const anthropic = getClient();

  const userContent = [
    `토픽: ${topicLabel} (slug: ${topic})`,
    "",
    "기사 목록 (최신순, 필요한 만큼만 참고):",
    ...news.slice(0, 8).map((n, i) => {
      const when = n.publishedAt.toISOString();
      return `${i + 1}. [${n.source} · ${when}] ${n.title}\n   ${n.snippet}\n   url: ${n.url}`;
    }),
  ].join("\n");

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = response.content.find((c) => c.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
  const parsed = extractJson(raw) as {
    title?: string;
    summary?: string;
    sourceUrl?: string;
    source?: string;
  };

  return {
    topic,
    title: parsed.title?.trim() || `${topicLabel} 요약`,
    summary: parsed.summary?.trim() || "",
    sourceUrl: parsed.sourceUrl?.trim() || news[0]?.url || "",
    source: parsed.source?.trim() || news[0]?.source || "",
  };
}

export { extractJson as __extractJsonForTest };
