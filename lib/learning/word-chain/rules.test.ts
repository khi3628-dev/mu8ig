import { describe, it, expect } from "vitest";
import { firstChar, lastChar, validateChain, normalize } from "./rules";

const dict = new Set([
  "align",
  "negotiate",
  "escalate",
  "empower",
  "review",
  "buy-in",
]);
const has = (w: string) => dict.has(normalize(w));

describe("firstChar / lastChar", () => {
  it("returns leading/trailing ascii letters", () => {
    expect(firstChar("Align")).toBe("a");
    expect(lastChar("align")).toBe("n");
  });
  it("ignores hyphens/punctuation", () => {
    expect(firstChar("buy-in")).toBe("b");
    expect(lastChar("buy-in")).toBe("n");
  });
});

describe("validateChain", () => {
  it("accepts a valid chain word", () => {
    expect(
      validateChain({
        word: "negotiate",
        lastChar: "n",
        history: ["align"],
        dictionaryHas: has,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects wrong starting letter", () => {
    expect(
      validateChain({
        word: "review",
        lastChar: "n",
        history: ["align"],
        dictionaryHas: has,
      }),
    ).toEqual({ ok: false, reason: "wrong-start" });
  });

  it("rejects duplicates", () => {
    expect(
      validateChain({
        word: "align",
        lastChar: null,
        history: ["align"],
        dictionaryHas: has,
      }),
    ).toEqual({ ok: false, reason: "duplicate" });
  });

  it("rejects unknown words", () => {
    expect(
      validateChain({
        word: "notaword",
        lastChar: null,
        history: [],
        dictionaryHas: has,
      }),
    ).toEqual({ ok: false, reason: "not-found" });
  });

  it("rejects too short", () => {
    expect(
      validateChain({
        word: "ok",
        lastChar: null,
        history: [],
        dictionaryHas: has,
      }),
    ).toEqual({ ok: false, reason: "too-short" });
  });
});
