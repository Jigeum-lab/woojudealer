@AGENTS.md
@.claude/harness/context-engineering.md
@.claude/harness/gates.md
@.claude/harness/model-routing.md

# 우주딜러 — 상시 작업 규칙

## 프로젝트

주식회사 우주시스템(대표 우정현)의 B2B 폐PC 수거 → 보안삭제(DoD 5220.22-M) → 인증서 자동발급 플랫폼. **실제 사업화** 대상(증빙용 아님).

- **구조**: pnpm + Turborepo 모노레포 — `apps/web`(Next.js 16 + React 19 + Tailwind v4 + shadcn/ui + Supabase), `apps/api`(NestJS — 2차 크롤러·재고ERP·견적 API), `supabase/`(마이그레이션).
- **명령**: `pnpm dev` / `pnpm build` / `pnpm typecheck` (전부 turbo). 개별 앱은 `--filter=web` / `--filter=api`.
- **인증**: Supabase Auth (이메일 + Google/Kakao OAuth 배선, Naver 준비중). 관리자는 `role=admin`만 `/admin` 접근.
- **배포**: Vercel(jigeumlab 팀). 모노레포라 **Root Directory = `apps/web`** 필수.
- 남은 셋업·검증 절차는 `SETUP.md` 참조.

## 일하는 방식 (필수)

- **삭제·git push·배포(vercel)·외부 전송**은 되돌리기 어려우니 **반드시 먼저 확인**받고 진행. 임의 실행 금지.
- **화면 확인은 헤드리스 스크린샷**으로 (브라우저 창 띄우지 말 것).
- **애매하면 추측하지 말고 질문.** 해석이 여러 개면 제시하고 고르게 한다. 선택지가 있으면 AskUserQuestion(클릭 UI) 사용.
- **불확실한 수치·출처엔 태그**: `(확인 필요)` / `(추정)` / `(가상)`. 환각 금지.
- 요청 범위 밖 추가·과한 추상화·안 부서진 것 수정 금지. 변경된 모든 줄이 요청으로 직접 이어질 것.
- 완료 주장 전 검증(빌드·타입체크·E2E). 실패하면 그대로 보고.

## 답변 톤

- 1인 컨설팅펌(지금랩, jigeumlab@gmail.com) 현실 고려한 **실용적 추천** — 과도한 엔지니어링 지양.
- 요약은 **짧게, 작업 결과만.** 한 것을 다 늘어놓지 말 것.
- **표는 코드블록 밖** 마크다운 표로 (파이프 표·ASCII 박스·카드격자 = 코드블록 금지). 다이어그램·복사용 코드·프롬프트만 코드블록 허용.
