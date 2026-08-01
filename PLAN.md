# Ultra Plan — Business English Learning App for Korean Office Workers (`mu8ig`)

> 한국어 직장인이 발표·비즈니스 영어를 재미있게 익히는 모바일-퍼스트 Next.js 앱.
> Word Chain · 발표 표현 카드 · 상황별 다이얼로그 · 데일리 챌린지 + 스트릭 · 내 말투 녹음 → 맞춤 영어 문장 생성(AI).
> localStorage 단독 저장, Claude Sonnet 4.6(`claude-sonnet-4-6`) + prompt caching, EN/KO 이중 언어, 모바일 우선.

## Features
1. **Word Chain** — 비즈니스 어휘 끝말잇기 (타이머·콤보·베스트 스코어, AI 단어 검증 옵션)
2. **Flashcards** — Opening / Transition / Q&A 카테고리 발표 표현, Leitner SRS
3. **Dialogues** — 회의/이메일/협상 시나리오 fill-blank & sentence-order
4. **Daily Challenge + Streak** — 매일 미니 미션, 캘린더 시각화
5. **Voice Style ★** — 한국어로 녹음(Web Speech API, 오디오 서버 미전송) → AI가 톤·정중함·군말·호흡 분석 → 같은 말투의 영어 문장 3종 생성
6. (보조) 발표문 표현 AI 피드백

## Stack
- Next.js 16.1.7 App Router, React 19, TypeScript 5 strict, Tailwind v4
- Zustand + persist(localStorage), Zod, lucide-react, clsx + tailwind-merge, vitest
- `@anthropic-ai/sdk` (Claude Sonnet 4.6, prompt caching)
- Web Speech API(한국어 STT) + MediaRecorder (오디오 서버 전송 X)

## Routes
```
app/
  layout.tsx, page.tsx, globals.css     # rewrite
  (learn)/
    layout.tsx
    word-chain/page.tsx
    flashcards/page.tsx, [category]/page.tsx
    dialogues/page.tsx, [scenarioId]/page.tsx
    daily/page.tsx
    voice-style/page.tsx       ★
    stats/page.tsx
  api/
    listings/route.ts, export/route.ts  # keep
    ai/{validate-word,presentation-feedback,style-profile,style-generate}/route.ts
```

## Phased Implementation
1. Scaffolding (layout, home, stores, i18n)
2. Word Chain (정적)
3. Flashcards + SRS
4. Dialogues
5. Daily + Streak
6. AI 기본 통합 (validate-word, presentation-feedback)
7. Voice Style (record → analyze → generate)
8. Verify + commit + push

## Preserved (수정 금지)
- `sports-toto/**`, `lib/naver-land.ts`, `lib/obsidian-exporter.ts`, `lib/types.ts`
- `app/api/listings/**`, `app/api/export/**`

## AI Contract 요약
- `/api/ai/validate-word` — 끝말잇기 단어 검증 (`{valid, reason, definition}`)
- `/api/ai/presentation-feedback` — 발표문 채점 (`{score, strengths, suggestions, improvedExample}`)
- `/api/ai/style-profile` — 한국어 transcript → `StyleProfile` (tone, pacing, politeness…)
- `/api/ai/style-generate` — profile + situationId → 영어 변형 3개

## Env
`ANTHROPIC_API_KEY`(필수), `AI_MOCK=1`(개발 시 픽스처 응답)
