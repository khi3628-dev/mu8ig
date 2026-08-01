export type Locale = "en" | "ko";

export interface BusinessWord {
  word: string;
  pos: "noun" | "verb" | "adj" | "adv" | "phrase";
  definitionKo: string;
  level: 1 | 2 | 3;
  tags: string[];
}

export interface Expression {
  id: string;
  category: "opening" | "transition" | "qa";
  en: string;
  ko: string;
  exampleEn: string;
  exampleKo: string;
  contextNote?: string;
}

export interface DialogueTurn {
  speaker: string;
  en: string;
  ko: string;
}

export interface DialogueBlank {
  turnIndex: number;
  answer: string;
  hintKo?: string;
  options?: string[];
}

export interface DialogueScenario {
  id: string;
  kind: "fill-blank" | "sentence-order";
  domain: "meeting" | "email" | "negotiation";
  title: { en: string; ko: string };
  contextKo: string;
  turns: DialogueTurn[];
  blanks?: DialogueBlank[];
  scrambled?: string[]; // for sentence-order kind
  correctOrder?: number[];
}

export interface DailyChallenge {
  id: string;
  kind: "word-chain" | "flashcards" | "dialogue" | "voice-style";
  titleKo: string;
  titleEn: string;
  descriptionKo: string;
  descriptionEn: string;
  rewardPoints: number;
  payload?: Record<string, unknown>;
}

export interface VoiceSituation {
  id: string;
  ko: string;
  en: string;
  contextKo: string;
  sampleEn: string;
  domain: "meeting" | "email" | "presentation" | "negotiation" | "one-on-one";
}

export interface StyleProfile {
  tone: "formal" | "semiformal" | "casual";
  registerKo: string;
  fillers: string[];
  pacing: "short" | "medium" | "long";
  politenessLevel: 1 | 2 | 3 | 4 | 5;
  summaryKo: string;
  exampleEnVoice: string;
  generatedAt: number;
}

export interface GeneratedSentence {
  id: string;
  situationId: string;
  variant: "direct" | "diplomatic" | "casual";
  en: string;
  ko: string;
  note: string;
  savedAt: number;
}

export interface ChainEntry {
  word: string;
  validatedBy: "seed" | "ai";
  scoreDelta: number;
  timestampMs: number;
}

export interface StreakState {
  current: number;
  longest: number;
  lastCompletedISODate: string | null;
}

export type DailyHistoryEntry = {
  wordChainScore?: number;
  flashcardsReviewed?: number;
  dialogueCompleted?: boolean;
  voiceGenerated?: number;
  challengeCompleted?: boolean;
};

export interface SRSEntry {
  box: 1 | 2 | 3 | 4 | 5;
  dueAt: number;
  lastReviewedAt: number;
}
