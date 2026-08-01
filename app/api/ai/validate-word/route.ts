import { NextResponse } from "next/server";
import { aiMock, DEFAULT_MODEL, getAnthropic } from "@/lib/learning/ai/client";
import { SYSTEM_VALIDATE_WORD } from "@/lib/learning/ai/prompts";
import {
  ValidateWordReq,
  ValidateWordRes,
} from "@/lib/learning/ai/schemas";
import { extractJson } from "@/lib/learning/ai/parse";
import { ipFromHeaders, rateLimit } from "@/lib/learning/ai/rate-limit";
import { mockValidateWord } from "@/lib/learning/ai/mocks";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = ipFromHeaders(req.headers);
  const rl = rateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: { code: "rate_limited", messageKo: "요청이 많아요. 잠시 후 다시 시도해주세요." } },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } },
    );
  }

  let parsed: ValidateWordReq;
  try {
    parsed = ValidateWordReq.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", messageKo: "요청 형식이 잘못됐어요." } },
      { status: 400 },
    );
  }

  if (aiMock()) {
    return NextResponse.json(mockValidateWord(parsed.word));
  }

  try {
    const client = getAnthropic();
    const resp = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 300,
      system: [
        {
          type: "text",
          text: SYSTEM_VALIDATE_WORD,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            word: parsed.word,
            lastChar: parsed.lastChar,
            history: parsed.history,
          }),
        },
      ],
    });
    const textBlock = resp.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("no text");
    }
    const raw = extractJson(textBlock.text);
    const validated = ValidateWordRes.parse(raw);
    return NextResponse.json(validated);
  } catch {
    return NextResponse.json({
      valid: false,
      reason: "AI 응답을 이해하지 못했어요.",
    } satisfies ValidateWordRes);
  }
}
