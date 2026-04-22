# Demo Toto MY

말레이시아 Sports Toto 를 참고한 숫자 예측 게임 웹앱 데모.

## ⚠️ 법적 고지 (중요)

**SIMULATION ONLY.** 본 프로젝트는 **교육 / 포트폴리오 목적의 데모**이며,
Sports Toto Malaysia Sdn Bhd 와 **무관**합니다. 라이선스를 받은 도박
서비스가 아니며, 다음과 같은 이유로 **실제 운영에 사용해서는 안 됩니다**:

- 말레이시아에서 숫자 예측 / 온라인 도박 서비스를 운영하려면 Pool Betting
  Act 1967 / Common Gaming Houses Act 1953 에 따른 재무부 라이선스가
  필요하며, 온라인 전달은 MCMC 감독 대상입니다.
- 모든 결제는 **Stripe 테스트 모드**로만 구성되어 실제 금전 이동이 없습니다.
- 18세 이상 전용. 이용자는 본인의 거주 관할구역에서 이러한 게임이 합법인지
  스스로 확인할 책임이 있습니다.

상표/로고는 "Sports Toto" 의 것을 사용하지 않고, 일반 명칭 "Demo Toto MY"
로만 표기합니다.

---

## 기술 스택

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- TailwindCSS v4
- Prisma + SQLite (dev)
- NextAuth v5 (Phase 4+)
- Stripe 테스트 모드 (Phase 5+)
- Zustand (bet slip 상태)
- Zod (클라이언트/서버 공용 검증)
- Vitest (정산 로직 단위 테스트)

## 구조

```
sports-toto/
├── app/              # App Router 페이지 + API 라우트
├── components/       # UI 컴포넌트 (layout, game, picker, betslip ...)
├── lib/
│   ├── db.ts         # Prisma client
│   ├── games/        # 게임 레지스트리, 타입, 정산 로직 (Phase 3+)
│   └── currency.ts   # sen ↔ MYR 포맷
├── prisma/
│   ├── schema.prisma # SQLite 데이터 모델
│   └── seed.ts       # 7 게임 + 샘플 과거 draw
└── state/            # Zustand 스토어 (Phase 3)
```

## 로컬 실행

```bash
cp .env.example .env
# DATABASE_URL, AUTH_SECRET 등 채우기
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev    # http://localhost:3000
```

## 구현 단계

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | Scaffold + DB + 레이아웃 + 홈 | ✅ |
| 2 | 게임 카탈로그 + 결과 조회 | 예정 |
| 3 | 번호 선택 + 베팅 시뮬레이터 | 예정 |
| 4 | 인증 + 지갑 | 예정 |
| 5 | 결제 (Stripe 테스트) + 정산 | 예정 |
| 6 | 관리자 도구 + 책임 게이밍 | 예정 |

## 개발 참고 사항

- SQLite 는 Prisma enum 을 지원하지 않으므로, 역할/상태는 `String` 필드로
  저장하고 `lib/games/types.ts` 의 리터럴 union 으로 타입 안전성을 유지.
- 모든 금액은 **정수 sen** (1 MYR = 100 sen) 로 저장해 부동소수점 오차를
  방지. 표시할 때만 `lib/currency.ts` 의 `senToMyr` 로 포맷.
- `prisma/seed.ts` 는 idempotent 하지 않으므로 재실행 시 기존 게임/드로우를
  지우고 다시 생성합니다.
