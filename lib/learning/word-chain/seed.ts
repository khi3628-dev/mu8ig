import wordsData from "@/lib/data/business-words.json";
import type { BusinessWord } from "../types";
import { normalize, firstChar } from "./rules";

const words = wordsData as BusinessWord[];

const dict = new Set(words.map((w) => normalize(w.word)));
const byFirstChar = new Map<string, BusinessWord[]>();
for (const w of words) {
  const c = firstChar(w.word);
  const list = byFirstChar.get(c) ?? [];
  list.push(w);
  byFirstChar.set(c, list);
}

export function dictionaryHas(word: string): boolean {
  return dict.has(normalize(word));
}

export function findWord(word: string): BusinessWord | undefined {
  const n = normalize(word);
  return words.find((w) => normalize(w.word) === n);
}

export function pickStarterWord(): BusinessWord {
  return words[Math.floor(Math.random() * words.length)];
}

export function suggestByFirstChar(
  c: string,
  exclude: Set<string> = new Set(),
): BusinessWord | undefined {
  const bucket = byFirstChar.get(c.toLowerCase()) ?? [];
  return bucket.find((w) => !exclude.has(normalize(w.word)));
}

export const allBusinessWords = words;
