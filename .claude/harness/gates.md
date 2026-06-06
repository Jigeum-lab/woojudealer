# 게이트 패턴

woojudealer 개발 워크플로우에서 사용하는 게이트 패턴 정의.
**모든 작업은 해당 게이트를 순서대로 통과한 후 진행한다.**

---

## 1. HARD-GATE

선행 조건 미충족 시 작업 완전 중단. 우회 없음.

```
❌ [HARD-GATE] {이유}
{선행 작업} 먼저 완료하세요.
```

### 발동 조건

| 조건 | 메시지 |
|------|--------|
| `npx tsc --noEmit` 실패 상태에서 push 시도 | TypeScript 오류가 있습니다. 오류 수정 후 진행하세요. |
| `npm run build` 실패 상태에서 push 시도 | 빌드 실패. 빌드 오류 수정 후 진행하세요. |
| Supabase 마이그레이션 미적용 상태에서 DB 코드 작성 | `supabase db push` 또는 마이그레이션 적용 후 진행하세요. |
| AGENTS.md가 명시한 docs를 읽지 않고 Next.js API 사용 | `node_modules/next/dist/docs/` 해당 섹션 먼저 읽으세요. |
| Task A 미완료 상태에서 real auth UUID를 가정하는 코드 작성 | auth-context는 여전히 mock입니다. bizNo 브릿지 패턴을 사용하세요. |

---

## 2. SOFT-GATE

권장 조건 미충족이지만 사용자 선택으로 진행 가능.
경고 표시 후 AskUserQuestion으로 위임.

```
⚠️ [SOFT-GATE] {경고 — 무엇이 부족하고 어떤 영향이 있는지}
```

### 발동 조건

| 조건 | 위험 |
|------|------|
| `lib/types.ts` 수정 | 모든 페이지·lib/db/* 파일에 ripple effect. 영향 파일 목록 먼저 확인 |
| 공유 컴포넌트 (`components/ui/*`, `components/site-*`) 수정 | 여러 페이지 동시 영향. 변경 범위 확인 필요 |
| Supabase 마이그레이션 파일 추가 | 되돌리기 어려운 스키마 변경. 내용 확인 후 진행 |
| RLS 정책 변경 | 보안 영향. 의도한 접근 범위인지 확인 |
| `lib/auth-context.tsx` 수정 | Task A 범위. 다른 Task와 충돌 여부 확인 |

AUQ 옵션:
- 영향 범위 먼저 확인
- 현재 요청 그대로 진행

통과 시 로그:
```
[SOFT-GATE 통과] {이유} — 사용자 선택으로 진행.
```

---

## 3. Output Gate

대상 파일이 이미 존재할 때 작업 방향 확인. 덮어쓰기 사고 방지.

파일 존재 시 표시:
```
{파일명} 이 이미 존재합니다.
- 마지막 수정: {git log 기준}
- 주요 내용: {핵심 1줄}
```

AUQ 옵션 (3종):
| 옵션 | 의미 |
|------|------|
| 기존 파일 기반으로 수정 | Read → Edit — 전체 재작성 금지 |
| 새로 작성 (기존 내용 주석 처리) | 기존 내용을 파일 하단 `// Archive` 블록으로 이동 후 재작성 |
| 취소 | 작업 중단 |

---

## 4. Quality Gate

코드 완성 후 저장·커밋 전 체크리스트.
**이 게이트를 통과하지 못하면 "완료" 선언 금지.**

```
품질 게이트:
☐ npx tsc --noEmit 통과
☐ npm run build 통과
☐ 하드코딩된 mock ID 없음 ("c1", "u1" 등)
☐ console.log / TODO 주석 없음
☐ 삭제된 import 없음 (unused import 없음)
☐ lib/store에서 남아있는 import 없음 (Task B 완료 기준)
☐ wj:change 이벤트 리스너 없음 (Task B 완료 기준)
```

미달 시:
```
⚠️ [QUALITY GATE 미달] 다음 항목이 기준 미충족:
- {미달 항목}
→ 수정 후 재확인
```

---

## 5. Task Progression Gate

Task A → B → C 순서 제약. 의존 관계가 있는 Task는 선행 Task 완료 후 진행.

| Task | 의존 | Gate |
|------|------|------|
| Task A (Supabase Auth) | 없음 | 없음 |
| Task B (lib/store → lib/db) | 없음 (독립) | 없음 |
| Task C (Certificate PDF + `/c/{qr_token}`) | Task B 완료 | SOFT-GATE: Task B 7개 파일 마이그레이션 확인 |

현재 상태:
- Task B: ✅ 완료 (7개 파일 마이그레이션, 2026-06-07)
- Task A: 🔄 미완료 — auth-context.tsx 여전히 mock
- Task C: 🔄 미완료

---

## 6. Migration Gate

새 Supabase 마이그레이션 파일 작성 전 체크:

```
Migration Gate:
☐ 파일명 형식: YYYYMMDDHHMMSS_{설명}.sql
☐ 기존 마이그레이션과 충돌하는 테이블·컬럼 없음
☐ RLS 정책 변경 시 demo_open_rls 마이그레이션(20260606130000)과 충돌 없음
☐ 되돌리기 어려운 DROP/TRUNCATE는 SOFT-GATE 발동
```
