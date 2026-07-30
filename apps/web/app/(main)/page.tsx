"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  FlaskConical,
  Network,
  TvMinimalPlay,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";

/**
 * 랜딩 페이지.
 *
 * 우주딜러는 "수거 업체"가 아니라, 폐PC 한 대가 통과하며 서류 세 장
 * — 수거신청서·삭제인증서·견적서 — 을 남기는 순환 플랫폼이다.
 * 그래서 이 페이지는 기능 카드를 늘어놓는 대신 그 문서들을 그대로 보여준다.
 * 등장하는 번호·부품·금액은 전부 운영 중인 시스템의 실제 형식이다.
 */

/** 히어로 명세 — 한 대가 분해되어 값을 되찾는 과정 */
const TEARDOWN = [
  { part: "CPU", model: "AMD Ryzen 5 5600", note: "동작 검증" },
  { part: "메모리", model: "DDR4 16GB", note: "동작 검증" },
  { part: "SSD", model: "NVMe 512GB", note: "DoD 5220.22-M 삭제" },
  { part: "그래픽카드", model: "GTX 1660 Super", note: "동작 검증" },
  { part: "파워·케이스", model: "500W / M-ATX", note: "세척·재사용" },
];

/** 시그니처 — 실제 시스템이 발행하는 문서 3종 */
const DOCUMENTS = [
  {
    no: "REQ-2026-0012",
    title: "수거 신청서",
    desc: "회사·수량·픽업 일정이 접수되면 발번됩니다. 처리 단계가 바뀔 때마다 담당자 화면에 그대로 보입니다.",
    fields: [
      ["수거 대수", "9대"],
      ["제조사", "Lenovo"],
      ["상태", "수거 진행"],
    ],
    accent: "text-status-pickup",
  },
  {
    no: "CERT-2026-00006",
    title: "보안삭제 인증서",
    desc: "미국 국방부 표준으로 저장장치를 삭제하고 자동 발급합니다. QR을 찍으면 누구나 진위를 확인할 수 있습니다.",
    fields: [
      ["삭제 방식", "DoD 5220.22-M"],
      ["발급", "자동"],
      ["검증", "QR 공개 조회"],
    ],
    accent: "text-primary",
  },
  {
    no: "20260729_001",
    title: "견적서",
    desc: "되살린 부품으로 사양을 구성하면 견적서와 거래명세서가 나옵니다. 폐기물이 다시 상품이 되는 지점입니다.",
    fields: [
      ["품목", "21개 분류"],
      ["호환성", "자동 검증"],
      ["출력", "견적서·거래명세서"],
    ],
    accent: "text-status-done",
  },
];

/** 견적 시스템이 실제로 잡아내는 오조합 (compatibility.ts 판정 결과 형식) */
const COMPAT_CHECKS = [
  {
    ok: false,
    head: "마더보드가 지원하지 않는 메모리 규격입니다",
    body: "마더보드는 DDR5만 지원하는데 선택한 메모리는 DDR4 입니다. 물리적으로 장착되지 않습니다.",
  },
  {
    ok: false,
    head: "그래픽카드가 케이스에 들어가지 않습니다",
    body: "그래픽카드 길이 330mm > 케이스 허용 250mm (80mm 초과)",
  },
  {
    ok: true,
    head: "CPU쿨러 장착 가능",
    body: "쿨러 높이 157mm ≤ 케이스 허용 160mm",
  },
];

const TRACK_RECORD = [
  { icon: Building2, value: "22년", label: "업력", desc: "2003년부터 이어온 현장 경험" },
  { icon: Network, value: "25개", label: "전국 협력점", desc: "신규 투자 없이 지역별 당일 수거" },
  { icon: FlaskConical, value: "36배", label: "파일럿 검증", desc: "50대 처리로 가치 상승 실증" },
  { icon: TvMinimalPlay, value: "12,187명", label: "유튜브 구독자", desc: "'우주아빠TV' 영상 1,500개" },
];

export default function LandingPage() {
  const { user } = useAuth();
  const requestHref = user ? "/requests/new" : "/login?return_to=%2Frequests%2Fnew";
  const quoteHref = user ? "/quotes/new" : "/login?return_to=%2Fquotes%2Fnew";

  return (
    <>
      {/* ───────────────── 히어로 ───────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(var(--border-strong) 1px, transparent 1px), linear-gradient(90deg, var(--border-strong) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        {/* 초록 글로우는 명세 패널 그림자 하나로 충분하다 — 배경 블러는 두지 않는다 */}

        <div className="relative mx-auto grid max-w-[1240px] gap-12 px-4 py-16 sm:px-6 md:px-10 md:py-24 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div>
            <p className="mb-6 font-mono text-[12px] uppercase tracking-[0.18em] text-primary">
              기업 · PC방 · 공공기관 폐PC 원스톱
            </p>

            <h1 className="mb-6 text-[34px] font-black leading-[1.14] tracking-[-0.03em] text-foreground sm:text-[46px] md:text-[58px]">
              수거하고, 지우고,
              <br />
              증명하고,{" "}
              <span
                className="text-primary"
                style={{
                  fontFamily: "var(--font-display)",
                  textShadow: "0 0 44px rgba(0,213,99,0.45)",
                }}
              >
                다시 팝니다
              </span>
            </h1>

            <p className="mb-9 max-w-[560px] text-[17px] leading-relaxed text-text-secondary">
              고물상에 넘기면 대당 5,000원입니다. 우주딜러는 저장장치를 국제표준으로
              지우고 인증서를 발급한 뒤, 살아있는 부품으로 사양을 다시 구성해
              견적서에 올립니다.
            </p>

            <div className="mb-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="cta" size="lg">
                <Link href={requestHref}>
                  무료 수거 신청 <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href={quoteHref}>견적 짜보기</Link>
              </Button>
            </div>

            <dl className="flex flex-wrap gap-x-10 gap-y-4 border-t border-border pt-6">
              {[
                ["24시간", "내 수거"],
                ["21개 분류", "부품 데이터"],
                ["DoD 5220.22-M", "국제표준 삭제"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-mono text-[15px] font-semibold text-foreground">{v}</dt>
                  <dd className="mt-0.5 text-[13px] text-text-muted">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* 시그니처 아티팩트 — 분해 명세 */}
          <div className="rounded-xl border border-border bg-card shadow-[0_0_60px_-20px_rgba(0,213,99,0.25)]">
            <div className="flex items-baseline justify-between border-b border-border px-5 py-3.5">
              <span className="font-mono text-[12px] tracking-wide text-text-muted">
                처리 명세 · 폐PC 1대
              </span>
              <span className="font-mono text-[12px] text-text-muted">REQ-2026-0012</span>
            </div>

            <ul className="divide-y divide-border/60">
              {TEARDOWN.map((r) => (
                <li
                  key={r.part}
                  className="flex items-center gap-3 px-5 py-3 text-[13px]"
                >
                  <span className="w-[74px] shrink-0 text-text-muted">{r.part}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-foreground">
                    {r.model}
                  </span>
                  <span className="hidden shrink-0 items-center gap-1.5 text-[12px] text-primary sm:flex">
                    <Check className="size-3.5 stroke-[3]" />
                    {r.note}
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-t border-border px-5 py-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-text-muted">고물상 처리 시</span>
                <span className="font-mono text-text-muted line-through">5,000원</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">
                  우주딜러 회수 가치
                </span>
                <span
                  className="text-[24px] font-black text-primary"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  약 20만원
                </span>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-text-muted">
                2025년 고철 시세와 중고 PC 시장 조사 기반 자체 추정치입니다.
                실제 금액은 부품 상태에 따라 달라집니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── 서류 세 장 (시그니처) ───────────────── */}
      <section className="bg-card py-16 md:py-24">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 md:px-10">
          <div className="mb-12 max-w-[640px]">
            <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.18em] text-primary">
              남는 것
            </p>
            <h2 className="mb-4 text-[28px] font-black leading-tight tracking-[-0.02em] text-foreground md:text-[38px]">
              PC 한 대가 서류 세 장을 남깁니다
            </h2>
            <p className="text-[15px] leading-relaxed text-text-secondary">
              보안 담당자에게 필요한 건 &ldquo;처리했다&rdquo;는 말이 아니라 증빙입니다.
              접수부터 삭제, 재판매까지 각 단계가 조회 가능한 문서로 남습니다.
            </p>
          </div>

          <ol className="grid gap-4 md:grid-cols-3">
            {DOCUMENTS.map((doc, i) => (
              <li
                key={doc.no}
                className="group relative flex flex-col rounded-xl border border-border bg-background p-6 transition-colors hover:border-primary/40"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className={`font-mono text-[13px] font-semibold ${doc.accent}`}>
                    {doc.no}
                  </span>
                  <span className="font-mono text-[11px] text-text-muted">
                    {i + 1}/3
                  </span>
                </div>

                <h3 className="mb-2.5 text-[17px] font-bold text-foreground">{doc.title}</h3>
                <p className="mb-6 flex-1 text-[13px] leading-relaxed text-text-secondary">
                  {doc.desc}
                </p>

                <dl className="space-y-1.5 border-t border-border pt-4">
                  {doc.fields.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 text-[12px]">
                      <dt className="text-text-muted">{k}</dt>
                      <dd className="text-right font-mono text-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────────── 견적 시스템 ───────────────── */}
      <section className="border-y border-border bg-background py-16 md:py-24">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-4 sm:px-6 md:px-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.18em] text-primary">
              되파는 쪽
            </p>
            <h2 className="mb-4 text-[28px] font-black leading-tight tracking-[-0.02em] text-foreground md:text-[38px]">
              부품이 안 맞으면
              <br />
              견적이 나가지 않습니다
            </h2>
            <p className="mb-7 text-[15px] leading-relaxed text-text-secondary">
              메모리 규격, 그래픽카드 길이, 쿨러 높이, 파워 용량을 고를 때마다 대조합니다.
              물리적으로 조립되지 않는 구성은 발행 자체가 막힙니다. 22년 현장 경험을
              규칙으로 옮긴 부분입니다.
            </p>

            <dl className="mb-8 grid grid-cols-3 gap-4 border-y border-border py-5">
              {[
                ["695", "등록 부품"],
                ["21", "부품 분류"],
                ["3", "추천 사양"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt
                    className="text-[26px] font-black leading-none text-primary"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {v}
                  </dt>
                  <dd className="mt-1.5 text-[12px] text-text-muted">{l}</dd>
                </div>
              ))}
            </dl>

            <p className="font-mono text-[12px] leading-relaxed text-text-muted">
              부품 호환성 자동 매칭 특허출원 4-2023-071209-7
            </p>
          </div>

          {/* 호환성 판정 아티팩트 */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3.5">
              <span className="font-mono text-[12px] tracking-wide text-text-muted">
                호환성 검증
              </span>
            </div>
            <ul className="divide-y divide-border/60">
              {COMPAT_CHECKS.map((c) => (
                <li key={c.head} className="flex gap-3 px-5 py-4">
                  <span
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                      c.ok ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {c.ok ? (
                      <Check className="size-3 stroke-[3]" />
                    ) : (
                      <X className="size-3 stroke-[3]" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-[13px] font-semibold ${
                        c.ok ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {c.head}
                    </p>
                    <p className="mt-1 font-mono text-[12px] leading-relaxed text-text-secondary">
                      {c.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-border px-5 py-3.5">
              <p className="text-[12px] text-text-muted">
                판정 근거가 없는 항목은 통과시키지 않고 &ldquo;확인 필요&rdquo;로 남깁니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── 실적 ───────────────── */}
      <section className="bg-card py-16 md:py-24">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 md:px-10">
          <div className="mb-12 max-w-[760px]">
            <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.18em] text-primary">
              근거
            </p>
            <h2 className="mb-4 text-[28px] font-black leading-tight tracking-[-0.02em] text-foreground md:text-[38px]">
              맨땅에서 시작하지 않았습니다
            </h2>
            <p className="text-[15px] leading-relaxed text-text-secondary">
              전국 협력점과 22년치 거래처가 이미 자리 잡고 있습니다. 새로 지은 것은
              그 위에 올린 플랫폼뿐입니다.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {TRACK_RECORD.map((r) => (
              <div
                key={r.label}
                className="rounded-xl border border-border bg-background p-6 transition-colors hover:border-primary/30"
              >
                <r.icon className="mb-4 size-5 text-primary" />
                <div
                  className="text-[24px] font-black leading-none text-foreground md:text-[28px]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {r.value}
                </div>
                <div className="mb-2 mt-1.5 text-[13px] font-bold text-primary">
                  {r.label}
                </div>
                <p className="text-[12px] leading-relaxed text-text-muted">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────── CTA ───────────────── */}
      <section className="relative overflow-hidden border-t border-border bg-background py-16 text-center md:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[130px]"
        />
        <div className="relative mx-auto max-w-[720px] px-4 sm:px-6">
          <h2 className="mb-4 text-[28px] font-black leading-tight tracking-[-0.02em] text-foreground md:text-[40px]">
            전화 한 통이면 됩니다
          </h2>
          <p className="mb-9 text-[16px] leading-relaxed text-text-secondary">
            수량만 알려주시면 협력점이 방문합니다. 수거 비용은 받지 않습니다.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="cta" size="lg">
              <Link href={requestHref}>
                무료 수거 신청 <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/support">자주 묻는 질문</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
