# 모델 라우팅

woojudealer 개발 작업별 모델 선택 기준.

---

## 모델 티어

| 모델 | 역할 | 강점 |
|------|------|------|
| `claude-opus-4-8` | 아키텍처·판단 | 복잡한 추론, 다단계 설계, 트레이드오프 판단 |
| `claude-sonnet-4-6` | 주력 구현 | 품질·속도 균형, 대용량 컨텍스트, 코드 작성 |
| `claude-haiku-4-5-20251001` | 검증·포맷 | 속도 우선, 반복 작업, 기계적 확인 |

---

## 작업별 라우팅 테이블

| 작업 | 모델 | 이유 |
|------|------|------|
| Task A 설계 (auth flow, RLS 재설계) | Opus | 보안 아키텍처 + 트레이드오프 판단 |
| Task C 설계 (PDF storage, QR 검증 flow) | Opus | 다단계 설계 |
| 페이지 구현 (app/\*\*/page.tsx) | Sonnet | 코드 품질 + 컨텍스트 크기 |
| lib/db/\* 함수 작성·수정 | Sonnet | 타입 정확성 필요 |
| Supabase 마이그레이션 작성 | Sonnet | SQL 정확성 + RLS 논리 |
| 공유 컴포넌트 수정 | Sonnet | 영향 범위 넓음 |
| lib/types.ts 수정 | Sonnet | 타입 ripple effect 추적 필요 |
| tsc 오류 수정 | Sonnet | 오류 패턴 분석 |
| import 정리·미사용 변수 제거 | Haiku | 기계적 작업 |
| 품질 게이트 체크리스트 실행 | Haiku | 반복 확인, 속도 우선 |
| context7 문서 조회 | Sonnet | 이해 + 코드 적용 |
| 단순 텍스트·주석 수정 | Haiku | 속도 우선 |

---

## 에스컬레이션 기준

| 상황 | 현재 | 에스컬레이션 |
|------|------|-------------|
| tsc 오류 3건+ 이고 타입 구조 설계 판단 필요 | Sonnet | Opus |
| RLS 정책이 의도한 보안 모델과 충돌 | Sonnet | Opus |
| Task A auth flow에서 엣지케이스 충돌 | Sonnet | Opus |
| Supabase 마이그레이션 충돌로 rollback 필요 | Sonnet | 사용자 확인 |

---

## 비용 절감 원칙

- Haiku 먼저 → 품질 부족 시 Sonnet 에스컬레이션.
- Opus는 "설계 결정"이 필요한 곳만. 구현·수정에 Opus 사용 금지.
- context7 조회는 모델 무관 — 반드시 실행 (AGENTS.md 요건).
