# 우주딜러 셋업 & 남은 작업 (핸드오프)

> 2026-08-03 기준. **Supabase 연동·E2E 검증·Vercel 프로덕션 배포까지 완료.**
> 실서비스: https://woojudealer.vercel.app

## ✅ 끝난 것

### 인프라 (전부 연결·가동 중)

- **Supabase**: 프로젝트 `ymaujstokcjvedmzptpw` (Seoul). `apps/web/.env.local` 채워짐, CLI link 완료
- **마이그레이션**: `supabase/migrations/` **11개** 전부 원격 적용됨 (`supabase migration list --linked`로 확인 가능). 새 마이그레이션은 파일 추가 후 `supabase db push`
- **관리자**: `mokujin94@gmail.com` — `20260729130000_set_owner_admin.sql`이 자동 승격 (운영자 추가는 그 파일의 `is_owner_email` 목록에 이메일 추가 후 push)
- **Vercel**: jigeumlab 팀 / woojudealer. Root Directory `apps/web`, env 4종(Production·Preview) 등록됨. **main push = 자동 프로덕션 배포**
- **로컬 개발**: `docker compose up -d` (web `localhost:3400`, api `localhost:4100`). 호스트에서 `pnpm dev` 직접 실행 금지 — 컨테이너와 충돌

### E2E 검증 (2026-08-03, 헤드리스 Playwright)

회원가입 → 로그인 → 회사등록 → 수거신청(3-step) → 관리자 status 전진 →
`certified` 인증서 자동발급(CERT-2026-00007) → PDF 다운로드(한글·QR 정상, 0.19MB) →
`/c/{qr_token}` 공개 검증(비로그인 200, 잘못된 토큰 404) → `done` 정산 자동생성(₩4.5M pending) — **전부 통과.**

RLS 확인: company 계정은 자기 회사 신청만 조회 가능, 상태 변경 시도는 DB에서 차단됨.

이 과정에서 고친 것 (커밋 `ffe090e`·`000bfaf`·`fc32501`):

- **신규 가입자 회사등록 블로커** — `profiles.company_id` 연결 경로가 없어 가입 후 수거 신청이 불가능했음. `register_company()` RPC(마이그레이션 `20260802000000`)가 회사 생성+프로필 연결을 한 트랜잭션으로 처리. 동일 사업자번호는 `BIZ_NO_TAKEN` 거절(타사 데이터 노출 방지)
- `/requests`의 상태 전진 버튼을 관리자 전용으로 (mock 데모 잔재)
- 인증서 PDF 로고 깨짐(`logo-white.png` 래스터본으로 교체)·용량 10.7MB → 0.2MB(JPEG 압축)
- `me` 페이지 provider 라벨 이슈는 이미 해결돼 있었음 (이메일 계정 = "이메일 연동" 정상 표시)

### 테스트 계정 (실계정 아님 — 지우지 말 것)

- `e2e-0802@woojudealer.test` (company, "E2E 테스트주식회사") / `test-admin@woojudealer.test` (admin)
- 테스트 데이터: `REQ-2026-0013` (done), `CERT-2026-00007`
- 참고: 일반 signup은 `.test` TLD를 거부하므로 테스트 계정은 admin API(`email_confirm: true`)로 생성

## 🔴 남은 작업

### 1. Supabase Auth URL 설정 확인 (실사용자 받기 전 필수)

대시보드 → Authentication → URL Configuration:
- **Site URL** = `https://woojudealer.vercel.app`
- **Redirect URLs**에 `https://woojudealer.vercel.app/auth/callback` + `http://localhost:3400/auth/callback`

안 돼 있으면 회원가입 인증 메일 링크가 localhost로 간다. (확인 필요 — 대시보드에서만 볼 수 있음)

### 2. 커스텀 SMTP (실고객 받기 전 강력 권장)

Supabase 기본 메일러는 발송량 제한이 매우 낮음(시간당 수 건 수준). 대시보드 → Authentication →
Emails에서 커스텀 SMTP(예: Resend) 연결.

### 3. 기존 실계정 회사 연결

`153net@paran.com`(company)이 회사 미등록 상태 — 본인이 `/me`에서 회사 정보를 등록하면 됨
(이번 수정으로 신규/기존 사용자 모두 `/me`에서 등록 가능).

### 4. (선택) 소셜 로그인 provider 등록

배선은 완료, 화면 노출만 꺼져 있음 (`lib/auth-context.tsx` 주석 참고):
- Supabase → Authentication → Providers → **Google / Kakao** 활성화 + 각 개발자콘솔 OAuth 앱 등록
- Redirect URL: `https://woojudealer.vercel.app/auth/callback`
- 활성화 후 로그인 페이지에 버튼만 붙이면 됨. Naver는 네이티브 미지원 → 커스텀 OIDC 필요 (추후)

### 5. (선택) 커스텀 도메인

woojudealer.com을 Vercel 프로젝트에 연결하면 `NEXT_PUBLIC_SITE_URL`(Vercel env)과
인증서 QR URL(`app/(main)/requests/[id]/certificate/page.tsx`의 `https://woojudealer.com/c/…`,
현재 하드코딩)도 함께 정리할 것.
