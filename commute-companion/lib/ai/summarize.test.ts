import { describe, expect, it } from "vitest";
import { __extractJsonForTest as extractJson } from "./summarize";

describe("extractJson", () => {
  it("parses plain JSON", () => {
    const parsed = extractJson('{"title":"a","summary":"b"}') as { title: string };
    expect(parsed.title).toBe("a");
  });

  it("strips markdown code fences", () => {
    const parsed = extractJson('```json\n{"title":"x","summary":"y"}\n```') as {
      title: string;
    };
    expect(parsed.title).toBe("x");
  });

  it("throws on invalid JSON", () => {
    expect(() => extractJson("nope")).toThrow();
  });
});
