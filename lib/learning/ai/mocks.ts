import type {
  PresentationFeedbackRes,
  StyleGenerateRes,
  StyleProfileRes,
  ValidateWordRes,
} from "./schemas";

export function mockValidateWord(word: string): ValidateWordRes {
  const w = word.toLowerCase();
  return {
    valid: w.length >= 4,
    reason: w.length >= 4 ? "" : "너무 짧아요.",
    definition: {
      en: `A word commonly used in business: ${word}.`,
      ko: `비즈니스에서 자주 쓰이는 단어: ${word}.`,
    },
  };
}

export function mockPresentationFeedback(): PresentationFeedbackRes {
  return {
    score: 78,
    strengths: [
      "메시지가 명확합니다.",
      "구조가 잘 잡혀 있어요.",
    ],
    suggestions: [
      "숫자를 하나 더 넣으면 신뢰가 더해집니다.",
      "'basically' 같은 필러를 줄여보세요.",
    ],
    improvedExample:
      "To open, let me share three numbers that shaped this quarter.",
  };
}

export function mockStyleProfile(): StyleProfileRes {
  return {
    tone: "semiformal",
    registerKo: "정중하지만 실무적인 회사 회의 톤",
    fillers: ["일단", "그래서", "제가 볼 때는"],
    pacing: "medium",
    politenessLevel: 4,
    summaryKo: "존댓말 기반으로 신중하게 말하되, 결론을 놓치지 않는 실무형입니다.",
    exampleEnVoice:
      "Let me quickly share what we're seeing on the numbers.",
  };
}

export function mockStyleGenerate(situationId: string): StyleGenerateRes {
  return {
    variants: [
      {
        en: `Quick update from our side on ${situationId} — three things.`,
        ko: `${situationId} 관련해서 저희 쪽 짧게 업데이트드릴게요. 세 가지입니다.`,
        note: "직접형 — 사용자 톤에 가장 가깝게",
      },
      {
        en: `I'd love to briefly share where we are on ${situationId}, if that works.`,
        ko: `괜찮으시다면 ${situationId} 진행 상황을 간단히 공유드리고 싶습니다.`,
        note: "완곡형 — 정중하고 안전한 옵션",
      },
      {
        en: `Just a heads-up on ${situationId} — nothing dramatic, but worth flagging.`,
        ko: `${situationId} 관련해서 잠깐 알려드릴게요. 큰 건은 아니지만 짚어둘 만합니다.`,
        note: "캐주얼형 — 가까운 동료 대상",
      },
    ],
  };
}
