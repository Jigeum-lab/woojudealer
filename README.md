# 우주딜러 (Wooju Dealer)

B2B 폐PC 수거 → 보안삭제(DoD 5220.22-M) → 인증서 자동발급 **원스톱 플랫폼 PoC**.
기업이 버리는 PC가 환경부담 없이 처리됐다는 법적 증빙(인증서)을 즉시 받을 수 있습니다.

> 울주군 기술창업 생태계 지원사업 — 기술개발 패키지 / 주식회사 우주시스템

## 기술 스택

| 영역 | 사용 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) + React 19 + TypeScript |
| 스타일 | Tailwind CSS v4 + shadcn/ui (Radix UI) |
| 차트 / PDF | Chart.js · jsPDF + html2canvas-pro · qrcode |
| 데이터 | localStorage mock (PoC) — 백엔드 없이 클라이언트에서 동작 |

## 시작하기

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속.

## 시연 시나리오

```
① PC방 사장님 (주 경로)
   로그인 → 수거 신청(3-step) → 신청 현황 → 인증서 PDF 다운로드

② 기업 ESG 담당자
   ESG 대시보드 → 탄소절감·회수가치 확인 → 리포트 PDF

③ 운영자
   운영자 데모 로그인 → 관리자 → 신청 status 변경
```

로그인은 데모용 mock입니다 — 소셜 버튼 클릭 시 체험 계정으로 로그인됩니다.
하단 푸터의 **데모 리셋**으로 초기 상태(회사 3곳·신청 10건)로 되돌릴 수 있습니다.

## 화면 (9)

| ID | 화면 | 경로 |
|---|---|---|
| M01 | 메인 랜딩 | `/` |
| A01 | 로그인 | `/login` |
| A02 | 마이페이지 | `/me` |
| F01 | 수거 신청 (3-step) | `/requests/new` |
| F02 | 신청 현황 | `/requests` |
| F03 | 인증서 | `/requests/[id]/certificate` |
| F04 | ESG 대시보드 | `/dashboard` |
| AD01 | 관리자 | `/admin` |
| S01 | FAQ + 약관 | `/support` |

## 처리 상태 흐름

```
requested → pickup → wiping → certified → done
```

`certified` 도달 시 인증서 PDF 다운로드가 활성화됩니다.
