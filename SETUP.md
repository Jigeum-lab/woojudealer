# 우주딜러 셋업 & 남은 작업 (핸드오프)

> 2026-08-09 기준. **Supabase 연동·E2E 검증·Vercel 프로덕션 배포까지 완료.**
> 실서비스: https://woojudealer.vercel.app

## ✅ 끝난 것

### 인프라 (전부 연결·가동 중)

- **Supabase**: 프로젝트 `ymaujstokcjvedmzptpw` (Seoul). `apps/web/.env.local` 채워짐, CLI link 완료
- **마이그레이션**: `supabase/migrations/` **13개** 전부 원격 적용됨 (`supabase migration list --linked`로 확인 가능). 새 마이그레이션은 파일 추가 후 `supabase db push`
  - 새 테이블을 만들면 **GRANT를 같이 써야 한다.** `20260727000000_restore_production_rls.sql`이 public 스키마 권한을 회수해 둬서, RLS 정책만 걸면 403이 난다 (`20260808010000` 참고)
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

### 화면 구성 (2026-08-09 개편)

고객이 보는 것과 내부 운영 도구를 갈랐다.

| 구분 | 경로 | 접근 |
|---|---|---|
| 랜딩 | `/` | 공개 |
| 견적 요청 (매입/판매) | `/estimate`, `/estimate/sell`, `/estimate/buy` | 공개 — **로그인 불필요** |
| 수거 신청·현황 | `/requests/new`, `/requests` | 로그인 |
| 인증서·공개 검증 | `/requests/[id]/certificate`, `/c/[token]` | 검증 페이지는 공개 |
| ESG·정산 | `/dashboard`, `/settlements` | 로그인 |
| **운영: 수거 관리** | `/admin` | admin |
| **운영: 견적 문의함** | `/admin/inquiries` | admin |
| **운영: 견적·재고 ERP** | `/quotes`, `/admin/parts` | admin |

- **운영 화면은 헤더 메뉴에 없다.** admin으로 로그인해도 주소를 직접 입력해 들어간다.
  통제는 각 구역 `layout.tsx`(서버) + RLS가 하므로 메뉴를 숨겨도 보안은 그대로.
- **견적 요청이 들어오면 `/admin/inquiries`를 직접 열어야 보인다** — 알림은 아직 없음.
- 견적 요청은 `submit_inquiry` RPC(security definer)로만 삽입된다. anon에는 테이블
  권한을 주지 않았으므로 조회는 불가능하다.

### 데이터 상태

실계정 2개(`mokujin94@gmail.com` admin, `153net@paran.com` company)만 있고
시드·테스트 데이터는 2026-08-03에 전부 삭제했다. 다음 발번은
`REQ-2026-0001` / `CERT-2026-00001` / `INQ-2026-0001`부터 시작한다.

테스트 계정을 만들 때 참고: 일반 signup은 `.test` TLD를 거부하므로
admin API(`email_confirm: true`)로 생성해야 한다.

## 🔴 남은 작업

### 1. Supabase Auth URL 설정 확인 (실사용자 받기 전 필수)

### 1. 커스텀 SMTP — 인증 메일을 다시 켜려면 필요

**현재 이메일 인증은 꺼져 있다**(autoconfirm). 기본 메일러 발송 한도가 시간당 2건이라
실사용자가 가입 메일을 못 받는 상황이었고, 지금은 가입 즉시 로그인된다.

메일 인증을 되살리려면 대시보드 → Authentication → Emails에서 커스텀 SMTP(예: Resend)를
연결한 뒤, 같은 화면에서 **Confirm email**을 다시 켠다.

Auth URL 설정(Site URL·Redirect)은 이미 프로덕션 기준으로 맞춰져 있다.

### 2. 기존 실계정 회사 연결

`153net@paran.com`(company)이 회사 미등록 상태 — 본인이 `/me`에서 회사 정보를 등록하면 됨.

### 3. Google 로그인 켜기

버튼과 배선은 완성돼 있고 **env 플래그로 잠겨** 있다. 순서:

1. Google Cloud Console → OAuth consent screen 설정 → Credentials → **OAuth client ID (Web)**
   - Authorized redirect URI: `https://ymaujstokcjvedmzptpw.supabase.co/auth/v1/callback`
   - Authorized JavaScript origins: `https://woojudealer.vercel.app`, `http://localhost:3400`
2. Supabase → Authentication → Providers → **Google** 활성화 + Client ID/Secret 입력
3. Vercel env에 `NEXT_PUBLIC_GOOGLE_LOGIN=1` 추가 후 재배포 (로컬은 `.env.local`)

이 순서를 지키지 않고 3번을 먼저 켜면 버튼이 눌려도 실패한다.
Kakao도 같은 방식. Naver는 네이티브 미지원 → 커스텀 OIDC 필요 (추후).

### 4. (선택) 커스텀 도메인

woojudealer.com을 Vercel 프로젝트에 연결하면 `NEXT_PUBLIC_SITE_URL`(Vercel env)과
인증서 QR URL(`app/(main)/requests/[id]/certificate/page.tsx`의 `https://woojudealer.com/c/…`,
현재 하드코딩)도 함께 정리할 것.
