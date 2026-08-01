/**
 * Word-chain rules for the English business-word game.
 * - Normalize: lowercase, trim, strip surrounding punctuation.
 * - "Letter": we consider only ASCII letters (a-z) when picking first/last so
 *   hyphens/apostrophes in words like "buy-in" don't break the chain — we
 *   effectively read "buyin" for chain purposes but preserve the original word.
 */

export function normalize(raw: string): string {
  return raw.trim().toLowerCase();
}

function lettersOnly(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, "");
}

export function firstChar(word: string): string {
  return lettersOnly(word).charAt(0);
}

export function lastChar(word: string): string {
  const s = lettersOnly(word);
  return s.charAt(s.length - 1);
}

export const MIN_WORD_LENGTH = 3;

export type ValidationError =
  | "too-short"
  | "wrong-start"
  | "duplicate"
  | "not-found";

export interface ValidationOk {
  ok: true;
}
export interface ValidationFail {
  ok: false;
  reason: ValidationError;
}
export type ValidationResult = ValidationOk | ValidationFail;

export function validateChain(params: {
  word: string;
  lastChar: string | null;
  history: string[];
  dictionaryHas: (w: string) => boolean;
}): ValidationResult {
  const w = normalize(params.word);
  if (lettersOnly(w).length < MIN_WORD_LENGTH) {
    return { ok: false, reason: "too-short" };
  }
  if (params.lastChar && firstChar(w) !== params.lastChar) {
    return { ok: false, reason: "wrong-start" };
  }
  if (params.history.includes(w)) {
    return { ok: false, reason: "duplicate" };
  }
  if (!params.dictionaryHas(w)) {
    return { ok: false, reason: "not-found" };
  }
  return { ok: true };
}
