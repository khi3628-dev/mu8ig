import { NextResponse } from "next/server";
import { aiMock, DEFAULT_MODEL, getAnthropic } from "@/lib/learning/ai/client";
import { SYSTEM_STYLE_PROFILE } from "@/lib/learning/ai/prompts";
import { StyleProfileReq, StyleProfileRes } from "@/lib/learning/ai/schemas";
import { extractJson } from "@/lib/learning/ai/parse";
import { ipFromHeaders, rateLimit } from "@/lib/learning/ai/rate-limit";
import { mockStyleProfile } from "@/lib/learning/ai/mocks";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = ipFromHeaders(req.headers);
  const rl = rateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: { code: "rate_limited", messageKo: "요청이 많아요." } },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } },
    );
  }

  let parsed: StyleProfileReq;
  try {
    parsed = StyleProfileReq.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", messageKo: "요청 형식이 잘못됐어요." } },
      { status: 400 },
    );
  }

  const totalLen = parsed.koTexts.reduce((a, s) => a + s.length, 0);
  if (totalLen > 5000) {
    return NextResponse.json(
      { error: { code: "too_long", messageKo: "입력이 너무 길어요. 짧게 다시 시도해주세요." } },
      { status: 400 },
    );
  }

  if (aiMock()) {
    return NextResponse.json(mockStyleProfile());
  }

  try {
    const client = getAnthropic();
    const resp = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 600,
      system: [
        {
          type: "text",
          text: SYSTEM_STYLE_PROFILE,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: JSON.stringify({ koTexts: parsed.koTexts }),
        },
      ],
    });
    const textBlock = resp.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("no text");
    const raw = extractJson(textBlock.text);
    const validated = StyleProfileRes.parse(raw);
    return NextResponse.json(validated);
  } catch {
    return NextResponse.json(mockStyleProfile());
  }
}
