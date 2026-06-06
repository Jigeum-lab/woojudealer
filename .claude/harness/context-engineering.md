# 컨텍스트 엔지니어링 가이드

에이전트·서브에이전트 호출 시 컨텍스트를 구성하는 표준 패턴.
**모든 작업은 이 가이드의 레이어 모델을 따른다.**

---

## 1. 계층적 컨텍스트 모델 (4-Layer)

레이어가 높을수록 구체적, 낮을수록 범용적.

### Layer 0 — 스택 상수 (Stack Constants)

**포함 대상**: 절대 바뀌지 않는 기술 제약
**언제 포함**: UI 컴포넌트·스타일·타입 정의 작업 시

핵심 상수:
- **Framework**: Next.js 16 App Router, React 19 — `AGENTS.md` 주의사항 필독
- **Style**: Tailwind v4, CSS variables, dark theme (`bg-card`, `text-foreground` 등 시맨틱 토큰)
- **DB**: Supabase `@supabase/ssr` — `createClient()` from `@/lib/supabase/client` (클라이언트), `createServerClient()` from `@/lib/supabase/server` (서버)
- **Auth**: 현재 mock (`lib/auth-context.tsx`). Task A 완료 전까지 real UUID 없음 → bizNo 브릿지 사용
- **Import 규칙**: `@/lib/*`, `@/components/*`, `@/app/*` — 상대경로 금지

### Layer 1 — 도메인 핵심 (Domain Core)

**포함 대상**: 타입·DB 인터페이스·기존 패턴
**언제 포함**: 항상. 모든 작업의 기본 컨텍스트
**압축 금지**: `lib/types.ts` 전체 — 타입 ID, status 순서, 상수 손실 방지

핵심 파일:
- `lib/types.ts` — `CollectionRequest`, `Company`, `Certificate`, `STATUS_ORDER`, `STATUS_META`
- `lib/db/requests.ts` — `mapRequest` (row.display_no → request.id "REQ-2026-XXXX")
- `lib/db/companies.ts` — `fetchCompanies`, `fetchCompany`, `upsertCompany`
- `lib/db/certificates.ts` — `fetchCertificateByDisplayNo` returns `{cert, requestUuid}`
- `supabase/migrations/` — 현재 스키마 상태

### Layer 2 — 작업 입력 (Task Inputs)

**포함 대상**: 현재 작업과 직접 연관된 파일만
**언제 포함**: 해당 파일이 존재하는 경우. 5,000자 초과 시 압축 가능
**주의**: 무관한 파일 주입 금지 — 노이즈

작업 유형별 포함 기준:

| 작업 | Layer 2에 포함 |
|------|---------------|
| 페이지 수정 | 해당 page.tsx + 참조하는 lib/db/* |
| Supabase 마이그레이션 추가 | 직전 migration 파일 + 현재 RLS 정책 |
| 공유 컴포넌트 수정 | 해당 컴포넌트 + 사용하는 페이지 목록 |
| lib/types.ts 수정 | types.ts 전체 + 영향받는 파일 목록 |
| Task A (Auth) | auth-context.tsx + middleware.ts + 마이그레이션 전체 |
| Task C (Certificate PDF) | certificate/page.tsx + lib/db/certificates.ts |

### Layer 3 — 현재 태스크 (Current Task)

**포함 대상**: 구체적 지시. 항상 포함, 가장 마지막에 위치
**형식**: 출력 파일, 완료 기준, 금지 사항, 마커 규칙

---

## 2. 컨텍스트 주입 템플릿

모든 에이전트 호출 시 이 형식 사용:

```
=== [LAYER 0: STACK] ===
{해당 작업에 필요한 스택 상수만}

=== [LAYER 1: DOMAIN CORE] ===
{lib/types.ts 전체 또는 핵심 타입}

=== [LAYER 2: TASK INPUTS] ===
[파일: {파일명} | 원본 크기: {N}자 → {압축/전체}]
{내용}

=== [LAYER 3: CURRENT TASK] ===
작업: {구체적 지시}
완료 기준: {tsc clean, build pass 등 검증 가능한 조건}
금지 사항: {하지 말아야 할 것}
마커: 미확인 → [확인 필요: {내용}], 미결 → [결정 필요: {내용}]
```

레이어가 비어 있으면 해당 헤더 자체를 생략 (빈 섹션 금지).

---

## 3. 컨텍스트 압축 규칙

| 파일 크기 | 처리 |
|----------|------|
| < 3,000자 | 전체 포함 |
| 3,000~8,000자 | 전체 포함 — 경고 없이 |
| 8,000~20,000자 | Haiku로 핵심 30% 압축 |
| > 20,000자 | 섹션별 요약 + "전체는 {파일명} 참조" 명시 |

**압축 절대 금지 항목** (크기 무관, 원문 유지):
- 타입 ID (`CollectionRequest`, `STATUS_ORDER` 등)
- Supabase 컬럼명·테이블명
- 완료 기준 문장
- `[확인 필요]` / `[결정 필요]` 마커가 붙은 항목
- 하드 제약 조건 (RLS 정책, auth 제약)

---

## 4. 델타 컨텍스트 (반복 수정용)

피드백 기반 수정 시 전체 재주입 대신 변경분만 주입:

```
=== [DELTA CONTEXT] ===
현재 버전 요약: {핵심 — 타입, 함수 시그니처, 완료 기준}
변경 요청: {피드백 원문 또는 요약}
변경 대상: {파일명:라인번호 또는 함수명}
불변 요소: {피드백에서 언급 안 된 모든 것}

=== [LAYER 1: DOMAIN CORE] ===
{연관 타입만 발췌}
```

불변 요소 도출: 피드백에서 명시된 것만 변경 대상 → 나머지 전체가 불변.

---

## 5. 오염 방지 체크리스트

에이전트 호출 전:
- [ ] 각 레이어에 해당 작업에 필요한 파일만 들어 있는가?
- [ ] 압축된 파일에 타입·컬럼명·완료 기준이 살아있는가?
- [ ] 무관한 페이지 파일이 섞여 있지 않은가?
- [ ] 이전 대화의 취소된 결정이 포함되지 않았는가?
- [ ] mock auth (`company.id = "c1"`) 관련 코드가 실제 UUID로 오인될 여지가 없는가?
