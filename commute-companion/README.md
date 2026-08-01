# 통근 컴패니언 (Commute Companion)

사무직 직장인의 출퇴근 시간을 **시간 절약**과 **비용 절약** 두 축으로 활용해 주는 웹앱.

- **AI 아침/저녁 브리핑** — 관심 토픽 뉴스를 3~5분 요약 + 오디오(TTS) 재생.
- **짠테크 딜 피드** — 통근 시간대에 행동 가능한 기프티콘·카드·편의점 특가.
- **유튜브 콘텐츠 export** — 같은 AI 요약에서 롱폼 대본·쇼츠 자막·메타(UTM 딥링크)까지 생성 → 앱 유입 깔때기.

## 수요 검증 (네이버 데이터랩, 2024.01~2026.05)
- `AI 요약/회의록` 검색량이 전 후보 중 가장 강하게 상승(2026년 정점 100).
- `기프티콘 할인` 상시 33~100 유지 → 비용절약 수요 견고.
- 통근 중엔 화면을 못 보는 순간이 많음 → **오디오가 결정적 차별점**.

## 개발 시작

```bash
cd commute-companion
cp .env.example .env
npm install
npm run db:migrate     # 초기 스키마 적용
npm run db:seed        # 기본 토픽 + 샘플 딜 시드
npm run dev            # http://localhost:3000
```

## 핵심 흐름 검증

1. `/onboarding` — 토픽·통근시각·지역·관심종목 설정.
2. `curl -X POST http://localhost:3000/api/briefing/generate -H "x-cron-secret: $CRON_SECRET"` — 브리핑 생성.
3. `/` — 오늘의 브리핑 카드 + 오디오 재생 확인.
4. `curl http://localhost:3000/api/content/export?date=today` — 유튜브/쇼츠 대본·자막·메타 패키지 확인.
5. `/deals` — 딜 클릭 → 리다이렉트 + `DealClick` 기록.

## 로드맵

- **Phase 1 (이 리포)**: 스캐폴드 + 브리핑 파이프라인 + 딜 피드 + 콘텐츠 export.
- **Phase 2**: Remotion 자동 영상 렌더, Web Push(PWA), 클라우드 TTS 사전 생성, 금융·날씨 섹션, NextAuth.
- **Phase 3 (수익화)**: 토스페이먼츠 구독, 프리미엄 게이팅, 딜 자동 수집, UTM→구독 퍼널 분석, B2B.
