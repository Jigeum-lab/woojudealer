# 우주딜러 (Wooju Dealer)

B2B 폐PC 수거 → 보안삭제(DoD 5220.22-M) → 인증서 자동발급 **원스톱 플랫폼**.
기업이 버리는 PC가 환경부담 없이 처리됐다는 법적 증빙(인증서)을 즉시 받을 수 있습니다.

> 주식회사 우주시스템 (대표 우정현) · woojudealer.com

## 구조 (모노레포)

```
woojudealer/            pnpm + Turborepo 워크스페이스
├── apps/
│   ├── web/            Next.js 16 (프론트 + SSR)
│   └── api/            NestJS 11 (크롤러·재고ERP·견적 API — 2차)
└── supabase/           DB 마이그레이션
```

## 기술 스택

| 영역 | 사용 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) + React 19 + TypeScript |
| 스타일 | Tailwind CSS v4 + shadcn/ui (Radix UI) |
| 차트 / PDF | Chart.js · jsPDF + html2canvas-pro · qrcode |
| 데이터 · 인증 | Supabase (PostgreSQL + Auth, RLS) |
| 백엔드 | NestJS (apps/api) |

## 시작하기

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # Supabase 값 입력
pnpm dev                                        # web + api 동시 실행 (turbo)
```

[http://localhost:3000](http://localhost:3000) 접속. 환경변수·마이그레이션·배포는 **[SETUP.md](./SETUP.md)** 참고.

## 인증

- 이메일/비밀번호 (Supabase Auth) — 기본
- 소셜: Google · Kakao (provider 등록 후 활성화) / Naver 준비 중
- 관리자(`/admin`)는 `role=admin` 계정만 접근

## 화면

| ID | 화면 | 경로 |
|---|---|---|
| M01 | 메인 랜딩 | `/` |
| A01 | 로그인 / 회원가입 | `/login`, `/signup` |
| A02 | 마이페이지 | `/me` |
| F01 | 수거 신청 (3-step) | `/requests/new` |
| F02 | 신청 현황 | `/requests` |
| F03 | 인증서 | `/requests/[id]/certificate` |
| F04 | ESG 대시보드 | `/dashboard` |
| AD01 | 관리자 | `/admin` |
| — | 정산 내역 | `/settlements` |
| — | 공개 QR 인증 검증 | `/c/[qr_token]` |
| S01 | FAQ + 약관 | `/support` |

## 처리 상태 흐름

```
requested → pickup → wiping → certified → done
```

`certified` 도달 시 인증서 자동발급(트리거) + PDF 다운로드 활성화. `done` 도달 시 정산 자동 생성.
