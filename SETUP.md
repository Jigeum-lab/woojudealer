# 우주딜러 셋업 & 남은 작업 (핸드오프)

> 2026-07-27 기준. 코드 정리(슈파베이스 연동 직전까지)는 완료됨. 아래는 실제로 굴리기 위한 남은 단계.

## ✅ 이미 끝난 것 (코드)

- pnpm + Turborepo 모노레포 (`apps/web` Next.js / `apps/api` NestJS)
- **실제 인증만 남김** — mock 데모 로그인·"운영자 데모 로그인" 버튼 제거, localStorage store 삭제
- 소셜 로그인 **실 OAuth 배선** (Google·Kakao) + `/auth/callback` 라우트 (Naver는 "준비 중")
- 위험한 **"데모 리셋"**(프로덕션 신청·인증서 전체 삭제) 제거
- 약관 동의 **체크박스 강조** (대표 피드백)
- **RLS 원복 마이그레이션** 추가 (`20260727000000_restore_production_rls.sql`) — 데모 전면개방 → 실운영 정책
- 빌드·타입체크 통과

## 🔴 남은 단계 (Supabase 연동부터)

### 1. Supabase 프로젝트 생성
supabase.com → New project → 이름 `woojudealer`, Region **Seoul** → 생성.

### 2. 환경변수 채우기
`apps/web/.env.example` 를 복사해 `apps/web/.env.local` 생성 후, Settings → API 값 입력:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — **필수** (공개 QR 인증 페이지가 사용)

### 3. 마이그레이션 적용
Supabase 대시보드 **SQL Editor**에 `supabase/migrations/` 의 6개 파일을 **파일명 순서대로** 붙여넣어 실행.
(또는 Supabase CLI: `supabase link` 후 `supabase db push`)

최종 상태 = 실운영 RLS(본인 회사/관리자 제한). 순서 중요.

### 4. 관리자(우정현) 지정
대표가 **앱에서 이메일로 회원가입**한 뒤, SQL Editor에서:
```sql
update public.profiles set role = 'admin' where email = '우정현대표이메일@example.com';
```
→ 이 계정으로 로그인하면 `/admin` 접근 가능 (일반 사용자는 접근 시 리다이렉트).

### 5. (선택) 소셜 로그인 provider 등록
지금은 **이메일/비밀번호로 실동작**. 소셜은 나중에:
- Supabase → Authentication → Providers → **Google / Kakao** 활성화 + 각 개발자콘솔 OAuth 앱 등록
- Redirect URL: `https://woojudealer.vercel.app/auth/callback` (+ 로컬 `http://localhost:3000/auth/callback`)
- Naver는 Supabase 네이티브 미지원 → 커스텀 OIDC 필요 (추후)

### 6. Vercel 배포 설정 (모노레포)
Vercel(jigeumlab 팀) → woojudealer → Settings:
- **Root Directory = `apps/web`** ← 현재 배포 실패의 원인
- **Environment Variables**: 위 4개 env 등록 (Production/Preview)
- Redeploy → `woojudealer.vercel.app` 갱신

## ⚠️ 연동 후 반드시 검증할 것 (테스트 시나리오)

1. 회원가입 → 이메일 인증 → 로그인 → 세션 유지
2. 수거 신청(3-step) → `requests` 저장 → 목록 표시
3. 관리자 로그인 → status 변경 → `certified` 도달 시 인증서 자동발급(트리거)
4. 인증서 PDF 다운로드 (한글 렌더) + QR 스캔 → `/c/{token}` 공개 검증
5. **RLS 확인**: A회사 계정으로 B회사 신청이 안 보이는지

## 📌 알려진 확인 필요 (연동 후 점검)

- **회사–프로필 연결**: 신규 사용자의 첫 수거신청 시 `profiles.company_id`가 실제로 링크되는지 (안 되면 RLS가 본인 신청을 못 봄). `requests/new` 플로우 점검 필요.
- `me` 페이지 provider 라벨이 항상 "Google 연동"으로 표시됨 (profiles가 provider 미저장) — 표시상 이슈.
