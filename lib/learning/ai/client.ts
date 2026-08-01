import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export const DEFAULT_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

export function aiMock(): boolean {
  return process.env.AI_MOCK === "1";
}
