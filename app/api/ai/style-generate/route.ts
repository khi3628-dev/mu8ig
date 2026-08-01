import { NextResponse } from "next/server";
import { aiMock, DEFAULT_MODEL, getAnthropic } from "@/lib/learning/ai/client";
import { SYSTEM_STYLE_GENERATE } from "@/lib/learning/ai/prompts";
import {
  StyleGenerateReq,
  StyleGenerateRes,
} from "@/lib/learning/ai/schemas";
import { extractJson } from "@/lib/learning/ai/parse";
import { ipFromHeaders, rateLimit } from "@/lib/learning/ai/rate-limit";
import { mockStyleGenerate } from "@/lib/learning/ai/mocks";
import situationsData from "@/lib/data/voice-situations.json";
import type { VoiceSituation } from "@/lib/learning/types";

const situations = situationsData as VoiceSituation[];

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

  let parsed: StyleGenerateReq;
  try {
    parsed = StyleGenerateReq.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", messageKo: "요청 형식이 잘못됐어요." } },
      { status: 400 },
    );
  }

  const situation = situations.find((s) => s.id === parsed.situationId);
  if (!situation) {
    return NextResponse.json(
      { error: { code: "unknown_situation", messageKo: "존재하지 않는 상황이에요." } },
      { status: 400 },
    );
  }

  if (aiMock()) {
    return NextResponse.json(mockStyleGenerate(situation.ko));
  }

  try {
    const client = getAnthropic();
    const resp = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 900,
      system: [
        {
          type: "text",
          text: SYSTEM_STYLE_GENERATE,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            profile: parsed.profile,
            situation: {
              id: situation.id,
              ko: situation.ko,
              en: situation.en,
              contextKo: situation.contextKo,
              sampleEn: situation.sampleEn,
            },
            userIntentKo: parsed.userIntentKo ?? "",
          }),
        },
      ],
    });
    const textBlock = resp.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("no text");
    const raw = extractJson(textBlock.text);
    const validated = StyleGenerateRes.parse(raw);
    return NextResponse.json(validated);
  } catch {
    return NextResponse.json(mockStyleGenerate(situation.ko));
  }
}
