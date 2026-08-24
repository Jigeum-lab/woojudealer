# 우주딜러 셋업 & 남은 작업 (핸드오프)

> 2026-08-24 기준. **Supabase 연동·E2E 검증·Vercel 프로덕션 배포까지 완료.**
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

### 대표 피드백 반영 (2026-08-24 통화)

관리자 모드를 직접 써 본 대표 피드백. 원문 정리는
`jigeumlab-outputs/clients/우주딜러/product/요구사항-통화-260824.md`.

- **부품 목록 페이징** — "695건 중 300건만 표시"로 나머지에 손이 닿지 않던 것. 100건씩
  페이지로 끊고 앞뒤 이동을 붙였다. 검색·분류를 바꾸면 1페이지로 돌아간다.
- **고객 구성기 프리셋 진입** — 랜딩의 추천 사양 카드가 `/estimate/pc`로만 보내
  구성기가 빈 화면으로 열리던 것. 이제 `?template={id}`를 달아 그 구성을 그대로 담는다.
  구성기 안에도 추천 사양 카드를 넣어 거기서 바로 바꿔 담을 수 있다.
  - 이걸 위해 `public_templates` 뷰에 `part_id`를 추가했다
    (`20260824000000_public_templates_part_id.sql`). 없으면 이름·가격만 와서 되살릴 수 없다.
- **호환성 — 경고에서 선택 차단으로** — 고른 뒤 "호환 안 됨"을 띄우는 대신 목록에서 뺀다
  (`blockingReasonFor`). 규칙은 `checkCompatibility`를 그대로 돌려서 얻으므로 판정이
  두 벌로 갈라지지 않는다. 숨긴 개수를 표시하고 "호환 안 되는 것도 보기"로 사유와 함께
  볼 수 있다. 관리자 견적서(`/quotes/new`)에는 단종 대체품 같은 예외를 위해
  "호환 안 되는 부품도 선택 허용" 잠금 해제를 뒀다(기본 잠금).
  - 실측(695건): 빈 구성 0건 차단 / AMD CPU→INTEL 보드 32개만 / Intel CPU→AMD 보드 27개만 /
    DDR4 보드→메모리 35건 / GPU 250mm 케이스→그래픽카드 39건.
- **부품 추가 · CSV 왕복** — 화면에서 한 건 추가(`부품 추가`)와, 목록을 CSV로 내려받아
  엑셀에서 고쳐 그대로 올리는 경로를 붙였다. 칸은
  `고유번호,분류,플랫폼,제품명,판매가,정가,품절,재고`. 없는 제품명은 추가되고 있는 건
  갱신된다(자연키 = 분류+제품명). 기존 `고유번호,가격` 두 칸 파일도 그대로 받는다.

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
Kakao도 같은 방식(`NEXT_PUBLIC_KAKAO_LOGIN=1`) — 버튼·배선은 이미 있다.

**네이버는 Supabase 네이티브 provider가 아니다.** 자체 OAuth 처리(네이버 인증 → 서버에서
사용자 조회·생성 → 세션 발급)를 붙여야 해서 구글·카카오와 공수가 다르다. 대표에게는
구글·카카오를 먼저 열고 네이버는 뒤로 두는 것으로 안내할 것.

이전 사이트 실패의 가장 큰 원인이 "회원가입이 너무 까다로웠던 것"이라는 대표 진술이 있어
(2026-08-24 통화) 소셜 로그인은 편의 기능이 아니라 이탈 방지 항목으로 다룬다.

### 4. 부품 가격 자동 갱신 (대표 요청, 착수 전 확인 필요)

대표는 매시간이 아니라 **주 1~2회 일괄 갱신**이면 된다고 했다. 지금은 CSV 왕복으로
수동 갱신이 가능한 상태이고, 자동 수집은 아직 없다(현재 단가는 엑셀 임포트 시점 값).

착수 전에 정리할 것:

- **컴퓨존 서면 확인.** 대표는 "담당자에게 설명해 IP 차단을 풀었다"고 했으나 그것은
  차단 해제이지 수집·재가공 동의가 아니다. 메일·카톡으로 한 줄이라도 남겨둘 것.
  다나와는 아직 논의된 바 없다.
- 확인이 되면 `apps/api`(NestJS)에 주 1~2회 배치로 넣는다. `parts.link`에 컴퓨존 상품
  URL이 이미 들어 있어 대상은 확보돼 있다. 실제 파싱 규칙은 상품 페이지 구조를 보고
  정해야 하므로, 확인 전에 미리 짜두지 않았다.
- 자동 수집이 막히거나 문제가 되면 CSV 왕복이 그대로 대안이 된다.

### 5. 기존 회원 약 2,000명 이관 (이전 개발사 협조 필요)

이전 Firebase 사이트에 이벤트로 모은 회원 데이터가 있고 다운로드 기능이 없다.
대표가 이전 개발사 대표와 연결해 주기로 했다. 요청 목록에 **수신동의 이력(동의 여부·시점)**을
반드시 포함할 것 — 번호만 받아오면 개편 안내 발송에 쓸 수 없다(광고성 정보 전송).

### 6. (선택) 커스텀 도메인

woojudealer.com을 Vercel 프로젝트에 연결하면 `NEXT_PUBLIC_SITE_URL`(Vercel env)과
인증서 QR URL(`app/(main)/requests/[id]/certificate/page.tsx`의 `https://woojudealer.com/c/…`,
현재 하드코딩)도 함께 정리할 것.
