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

- Next.js 16 (App Router) + React 19 + TypeScript strict
- TailwindCSS v4
- Prisma + **PostgreSQL** (Neon / Vercel Postgres / Supabase)
- NextAuth v5 (Credentials + Prisma adapter)
- Zustand (bet slip + 계정 볼라틸 상태)
- Zod (클라이언트/서버 공용 검증)
- Stripe 테스트 모드 (Phase 5+)
- Vitest (정산 로직 단위 테스트)

---

## 로컬 실행

Postgres 가 필요합니다. 빠른 방법은 **[Neon](https://neon.tech)** 무료
티어 — 브라우저에서 즉시 DB 하나 만들고 `DATABASE_URL` 복사.

```bash
cp .env.example .env
# .env 에 DATABASE_URL (Postgres) 와 AUTH_SECRET 채우기
# AUTH_SECRET 은: openssl rand -base64 32 로 생성

npm install                        # postinstall 이 prisma generate 를 실행
npx prisma db push                 # 스키마를 DB 에 적용 (마이그레이션 없이)
npm run db:seed                    # 7 게임 + 과거 드로우 시드
npm run dev                        # http://localhost:3000
```

---

## Vercel 배포

이 프로젝트는 monorepo 의 `sports-toto/` 하위 디렉토리에 있습니다.
Vercel 이 이것만 빌드하도록 설정합니다.

### 1. Vercel 프로젝트 설정

**Project Settings → General → Root Directory** 를 `sports-toto` 로 변경.
이후 Vercel 은 `sports-toto/package.json` 의 `vercel-build` 스크립트를
실행합니다 (`prisma generate && prisma db push --skip-generate && next build`).

### 2. Postgres DB 연결

가장 쉬운 경로: Vercel 대시보드에서 **Storage → Create → Postgres**
(Neon 기반). 생성 직후 `DATABASE_URL` 환경변수가 자동으로 설정됩니다.

또는 외부 Neon / Supabase URL 을 **Settings → Environment Variables** 에
`DATABASE_URL` 로 직접 등록.

### 3. 환경 변수 (Settings → Environment Variables)

| 변수 | 값 |
|---|---|
| `DATABASE_URL` | Postgres connection string (Storage 연결 시 자동) |
| `AUTH_SECRET` | `openssl rand -base64 32` 결과 |
| `NEXTAUTH_URL` | `https://<your-app>.vercel.app` |

Stripe 관련 (Phase 5 이후 필요):
| 변수 | 값 |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |

### 4. 배포 후 1회 시드

Vercel 빌드는 스키마만 적용하고 시드는 하지 않습니다 (데이터 덮어쓰기 방지).
배포 후 한 번 수동 시드:

```bash
# 로컬에서 production DATABASE_URL 로 연결해 seed 실행
DATABASE_URL="<Vercel 의 Postgres URL>" npm run db:seed
```

`seed.ts` 는 **idempotent** 합니다 — 게임/상금 테이블은 upsert, 샘플 드로우는
최초 1회만. 다시 실행해도 기존 베팅/사용자 데이터는 유지됩니다.

---

## 디렉토리 구조

```
sports-toto/
├── app/              # App Router 페이지 + API 라우트
├── components/       # UI (layout, game, picker, betslip, wallet ...)
├── lib/
│   ├── db.ts         # Prisma client singleton
│   ├── auth.ts       # NextAuth v5 설정
│   ├── wallet.ts     # 트랜잭션 안전 잔액 변경
│   ├── currency.ts   # sen ↔ MYR 포맷
│   └── games/        # registry, types, matching, cost, quickPick, validators
├── middleware.ts     # /account/**, /admin/** 보호
├── prisma/
│   ├── schema.prisma # Postgres 데이터 모델
│   └── seed.ts       # idempotent 시드
└── state/            # Zustand (betSlip, account)
```

---

## 구현 단계

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | Scaffold + DB + 레이아웃 | ✅ |
| 2 | 게임 카탈로그 + 결과 조회 | ✅ |
| 3 | 번호 선택 + 베팅 시뮬레이터 | ✅ |
| 4 | 인증 + 지갑 + 트랜잭션 베팅 | ✅ |
| 5 | 결제 (Stripe 테스트) + 정산 | 예정 |
| 6 | 관리자 도구 + 책임 게이밍 | 예정 |

---

## 개발 참고 사항

- 모든 금액은 **정수 sen** (1 MYR = 100 sen) 로 저장해 부동소수점 오차 방지
- NextAuth v5 JWT 는 **identity(id/role)만** 저장 — 잔액 같은 volatile
  필드는 `/api/account/me` 로 조회 후 Zustand `accountStore` 에 캐시.
  `update()` 가 JWT cookie 를 신뢰성 있게 갱신 못하는 beta 이슈 우회.
- Prisma 는 edge runtime 미지원 — API 라우트는 기본 Node runtime 으로 실행.
  `middleware.ts` 는 JWT cookie 만 읽으므로 edge 안전.
- 운영 환경에서는 `prisma db push` 대신 `prisma migrate deploy` 를 쓰는 게
  정석이지만, 이 데모에서는 단순화를 위해 `db push` 를 사용합니다.
