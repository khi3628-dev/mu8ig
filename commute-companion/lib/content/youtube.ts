import Anthropic from "@anthropic-ai/sdk";
import type { Section } from "@/lib/ai/summarize";

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 1500;

const SYSTEM_PROMPT = `너는 한국 뉴스 유튜브 채널 '통근 3분 브리핑' 의 스크립터야.
입력으로 오늘의 토픽별 요약 섹션 묶음을 받는다.

출력은 반드시 유효한 JSON 하나 (마크다운 코드펜스 금지).
스키마:
{
  "longform": {
    "title": string,            // 40자 내외, 클릭 유도
    "hook": string,             // 첫 8초 훅 (1~2문장, 이탈 방지)
    "script": string,           // 전체 대본 (3~5분 분량, 존댓말)
    "outro": string             // 마무리 + CTA (앱 유입)
  },
  "shorts": [                   // 정확히 3개
    {
      "title": string,          // 30자 이내
      "captions": string[],     // 5~7줄, 각 25자 이내
      "hook": string
    }
  ],
  "meta": {
    "description": string,      // 유튜브 설명란 본문 (본문+타임스탬프+CTA)
    "hashtags": string[],       // 5~8개, # 포함
    "thumbnailText": string     // 6~10자, 큰 텍스트용 문구
  }
}

주의:
- 자막·대본은 한국어 뉴스체.
- CTA는 반드시 "설명란 링크에서 내 맞춤 브리핑을 앱으로 받아보세요" 뉘앙스.
- 팩트만. 감상어 금지.`;

export interface YoutubePackage {
  longform: {
    title: string;
    hook: string;
    script: string;
    outro: string;
  };
  shorts: Array<{
    title: string;
    captions: string[];
    hook: string;
  }>;
  meta: {
    description: string;
    hashtags: string[];
    thumbnailText: string;
  };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required.");
  client = new Anthropic({ apiKey });
  return client;
}

function appendUtm(description: string, campaign: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const utm = new URLSearchParams({
    utm_source: "youtube",
    utm_medium: "video",
    utm_campaign: campaign,
  });
  const link = `${base}/onboarding?${utm.toString()}`;
  return `${description}\n\n▶ 내 맞춤 브리핑 앱에서 받기: ${link}`;
}

export async function generateYoutubePackage(
  sections: Section[],
  campaign = "daily-briefing"
): Promise<YoutubePackage> {
  const anthropic = getClient();

  const userContent = [
    "오늘의 브리핑 섹션:",
    ...sections.map((s, i) => {
      return `${i + 1}. [${s.topic}] ${s.title}\n   ${s.summary}\n   출처: ${s.source} (${s.sourceUrl})`;
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
  const parsed = extractJson(raw) as YoutubePackage;

  parsed.meta.description = appendUtm(parsed.meta.description, campaign);
  return parsed;
}
