import { z } from "zod";

export const ValidateWordReq = z.object({
  word: z.string().min(1).max(60),
  lastChar: z.string().max(2).nullable(),
  history: z.array(z.string().max(60)).max(200),
});
export type ValidateWordReq = z.infer<typeof ValidateWordReq>;

export const ValidateWordRes = z.object({
  valid: z.boolean(),
  reason: z.string().default(""),
  definition: z
    .object({ en: z.string(), ko: z.string() })
    .optional(),
});
export type ValidateWordRes = z.infer<typeof ValidateWordRes>;

export const PresentationFeedbackReq = z.object({
  category: z.enum(["opening", "transition", "qa"]),
  prompt: z.string().min(1).max(500),
  userText: z.string().min(1).max(1500),
});
export type PresentationFeedbackReq = z.infer<typeof PresentationFeedbackReq>;

export const PresentationFeedbackRes = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string()).max(5),
  suggestions: z.array(z.string()).max(5),
  improvedExample: z.string(),
});
export type PresentationFeedbackRes = z.infer<typeof PresentationFeedbackRes>;

export const StyleProfileReq = z.object({
  koTexts: z
    .array(z.string().min(1).max(2000))
    .min(1)
    .max(3),
});
export type StyleProfileReq = z.infer<typeof StyleProfileReq>;

export const StyleProfileRes = z.object({
  tone: z.enum(["formal", "semiformal", "casual"]),
  registerKo: z.string(),
  fillers: z.array(z.string()).max(10),
  pacing: z.enum(["short", "medium", "long"]),
  politenessLevel: z.number().int().min(1).max(5),
  summaryKo: z.string(),
  exampleEnVoice: z.string(),
});
export type StyleProfileRes = z.infer<typeof StyleProfileRes>;

export const StyleGenerateReq = z.object({
  profile: StyleProfileRes,
  situationId: z.string().min(1).max(80),
  userIntentKo: z.string().max(600).optional(),
});
export type StyleGenerateReq = z.infer<typeof StyleGenerateReq>;

export const StyleGenerateRes = z.object({
  variants: z
    .array(
      z.object({
        en: z.string(),
        ko: z.string(),
        note: z.string(),
      }),
    )
    .length(3),
});
export type StyleGenerateRes = z.infer<typeof StyleGenerateRes>;
