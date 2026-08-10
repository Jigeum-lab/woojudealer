"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, FlaskConical, Network, TvMinimalPlay } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ExplodedDiagram } from "@/components/landing/exploded-diagram";
import { SiteFooter } from "@/components/site-footer";

/**
 * 랜딩 페이지.
 *
 * 이 페이지의 임무는 하나 — 수거 신청 접수다. 그래서 CTA는 "무료 수거 신청"
 * 하나로만 두고, 나머지는 전부 그 버튼을 누를 이유를 쌓는 데 쓴다.
 *
 * 시각적으로는 분해도 한 장이 중심이다. "고철 5,000원이 아니다"를 문장으로
 * 설명하는 대신 부품값을 전부 적어 합계로 보여준다.
 *
 * 색 규칙: 초록은 돈(금액)과 행동(CTA)에만 쓴다. 섹션 라벨·구분선까지 초록으로
 * 칠하면 정작 금액이 눈에 안 들어온다.
 */

/** 실제 처리 흐름(requested → wiping → certified → done)과 같은 순서다 */
const PIPELINE = [
  {
    step: "수거",
    title: "협력점이 방문합니다",
    body: "수량만 알려주시면 전국 25개 협력점 중 가까운 곳이 갑니다. 수거 비용은 받지 않습니다.",
    leaves: "수거 신청서",
    no: "REQ-2026-0001",
  },
  {
    step: "삭제",
    title: "저장장치를 국제표준으로 지웁니다",
    body: "미국 국방부 표준 DoD 5220.22-M으로 덮어씁니다. 포맷과 달리 복구 도구로도 읽히지 않습니다.",
    leaves: "삭제 기록",
    no: "3-pass 완료",
  },
  {
    step: "증명",
    title: "인증서가 자동 발급됩니다",
    body: "삭제가 끝나면 인증서가 발급됩니다. QR을 찍으면 로그인 없이 누구나 진위를 확인합니다.",
    leaves: "보안삭제 인증서",
    no: "CERT-2026-00001",
  },
  {
    step: "재판매",
    title: "살아있는 부품은 값이 됩니다",
    body: "동작하는 부품으로 사양을 다시 구성해 판매하고, 회수한 값은 정산으로 돌려드립니다.",
    leaves: "정산 내역",
    no: "지급 대기",
  },
];

const VERIFY_ROWS = [
  ["인증번호", "CERT-2026-00001"],
  ["고객사", "주식회사 예시기업"],
  ["삭제 방식", "DoD 5220.22-M"],
  ["처리 대수", "25대"],
];

const TRACK_RECORD = [
  { icon: Building2, value: "22년", label: "업력", desc: "2003년부터 이어온 현장 경험" },
  { icon: Network, value: "25개", label: "전국 협력점", desc: "신규 투자 없이 지역별 당일 수거" },
  { icon: FlaskConical, value: "36배", label: "파일럿 검증", desc: "50대 처리로 가치 상승 실증" },
  { icon: TvMinimalPlay, value: "12,187명", label: "유튜브 구독자", desc: "'우주아빠TV' 영상 1,500개" },
];

/** 섹션 라벨 — 무채색으로 둔다. 초록은 금액과 CTA 몫이다 */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.18em] text-text-muted">
      <span aria-hidden className="h-px w-6 bg-border-strong" />
      {children}
    </p>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const requestHref = user ? "/requests/new" : "/login?return_to=%2Frequests%2Fnew";

  return (
    <>
      {/* ───────────────── 히어로 ───────────────── */}
      <section className="relative isolate overflow-hidden border-b border-border">
        {/* 배경 사진 — 우주딜러 기존 사이트에서 쓰던 이미지.
            LCP라 priority로 먼저 받고, 오버레이는 글자 대비를 위해 짙게 깐다. */}
        <Image
          src="/wooju/landing/hero-bg.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover object-center"
        />
        {/* 사진이 보일 만큼만 덮는다. 위는 헤더와 이어지게, 아래는 다음 섹션으로
            자연스럽게 떨어지게 어둡히고, 가운데는 열어 둔다. */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-background/45" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-transparent to-background"
        />

        <div className="relative mx-auto flex max-w-[860px] flex-col items-center px-4 py-24 text-center sm:px-6 md:py-32">
          <p className="mb-6 font-mono text-[12px] uppercase tracking-[0.18em] text-white/75 [text-shadow:0_1px_10px_rgba(0,0,0,0.7)]">
            기업 · PC방 · 공공기관 폐PC 원스톱
          </p>

          <h1 className="mb-6 text-[34px] font-black leading-[1.14] tracking-[-0.03em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.65)] sm:text-[46px] md:text-[58px]">
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

          {/* 사진 위 본문이라 기본 본문색보다 밝게 — 대비 확보 */}
          <p className="mb-9 max-w-[560px] text-[17px] leading-relaxed text-white/90 [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]">
            고물상에 넘기면 대당 5,000원입니다. 우주딜러는 저장장치를 국제표준으로
            지우고 인증서를 발급한 뒤, 살아있는 부품으로 값을 되찾아 돌려드립니다.
          </p>

          <Button asChild variant="cta" size="lg">
            <Link href={requestHref}>
              무료 수거 신청 <ArrowRight className="size-5" />
            </Link>
          </Button>
          <p className="mt-3 text-[13px] text-text-muted">
            수량만 알려주시면 됩니다. 수거 비용 없음.
          </p>
          {/* 아직 맡길지 안 정한 사람에게 주는 앞단 경로 */}
          <Link
            href="/estimate/sell"
            className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-text-secondary underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            얼마 받을 수 있는지 먼저 확인하기
            <ArrowRight className="size-3.5" />
          </Link>

          <dl className="mt-12 flex flex-wrap justify-center gap-x-10 gap-y-4 border-t border-border/60 pt-7">
            {/* 헤드라인의 세 동사(수거·삭제·증명)를 그대로 받는다.
                업력·협력점 같은 신뢰 지표는 아래 실적 섹션 몫이다 */}
            {[
              ["24시간", "내 수거"],
              ["DoD 5220.22-M", "국제표준 삭제"],
              ["QR 검증", "누구나 조회"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="font-mono text-[15px] font-semibold text-foreground">{v}</dt>
                <dd className="mt-0.5 text-[13px] text-text-muted">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ───────────────── 분해도 ───────────────── */}
      <section className="border-b border-border bg-background py-16 md:py-24">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-4 sm:px-6 md:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
          <div>
            <Eyebrow>한 대에서</Eyebrow>
            <h2 className="mb-4 text-[28px] font-black leading-tight tracking-[-0.02em] text-foreground md:text-[38px]">
              고철 5,000원이
              <br />
              아닙니다
            </h2>
            <p className="text-[15px] leading-relaxed text-text-secondary">
              저장장치는 국제표준으로 지우고, 살아있는 부품은 검증해 되팝니다.
              부품마다 값을 매겨 합산한 금액을 정산으로 돌려드립니다.
            </p>
          </div>

          <ExplodedDiagram />
        </div>
      </section>

      {/* ───────────────── 공정 ───────────────── */}
      <section className="bg-card py-16 md:py-24">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 md:px-10">
          <div className="mb-12 max-w-[660px]">
            <Eyebrow>처리 흐름</Eyebrow>
            <h2 className="mb-4 text-[28px] font-black leading-tight tracking-[-0.02em] text-foreground md:text-[38px]">
              한 대가 지나갈 때마다
              <br />
              서류가 쌓입니다
            </h2>
            <p className="text-[15px] leading-relaxed text-text-secondary">
              보안 담당자에게 필요한 건 &ldquo;처리했다&rdquo;는 말이 아니라 증빙입니다.
              네 단계가 각각 조회 가능한 기록을 남깁니다.
            </p>
          </div>

          <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PIPELINE.map((s, i) => (
              <li
                key={s.step}
                className="relative flex flex-col rounded-xl border border-border bg-background p-6 transition-colors hover:border-border-strong"
              >
                <div className="mb-5 flex items-center gap-2.5">
                  <span className="font-mono text-[12px] text-text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span aria-hidden className="h-px flex-1 bg-border" />
                  <span className="font-mono text-[12px] font-semibold uppercase tracking-wider text-foreground">
                    {s.step}
                  </span>
                </div>

                <h3 className="mb-2.5 text-[16px] font-bold leading-snug text-foreground">
                  {s.title}
                </h3>
                <p className="mb-6 flex-1 text-[13px] leading-relaxed text-text-secondary">
                  {s.body}
                </p>

                <div className="border-t border-border pt-4">
                  <div className="text-[11px] text-text-muted">남는 것</div>
                  <div className="mt-1 text-[13px] font-semibold text-foreground">{s.leaves}</div>
                  <div className="mt-0.5 font-mono text-[11.5px] text-text-muted">{s.no}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────────── 증명 ───────────────── */}
      <section className="border-y border-border bg-background py-16 md:py-24">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-4 sm:px-6 md:px-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <Eyebrow>검증</Eyebrow>
            <h2 className="mb-4 text-[28px] font-black leading-tight tracking-[-0.02em] text-foreground md:text-[38px]">
              감사 때 내밀 수 있는
              <br />
              증서를 드립니다
            </h2>
            <p className="mb-7 text-[15px] leading-relaxed text-text-secondary">
              인증서에 찍힌 QR은 우주딜러 서버로 연결됩니다. 받는 쪽은 계정 없이도
              그 자리에서 진위를 확인할 수 있어, 파일을 고쳐 보내는 식의 위조가
              통하지 않습니다.
            </p>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-5 border-t border-border pt-6">
              {[
                ["3회 덮어쓰기", "DoD 5220.22-M 표준 방식"],
                ["자동 발급", "삭제 완료 시점에 즉시"],
                ["공개 조회", "로그인 없이 QR로 검증"],
                ["PDF 다운로드", "한글 서식 그대로 출력"],
              ].map(([t, d]) => (
                <div key={t}>
                  <dt className="text-[14px] font-bold text-foreground">{t}</dt>
                  <dd className="mt-1 text-[12.5px] leading-relaxed text-text-muted">{d}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* 공개 검증 화면 — 실제 /c/{토큰} 페이지의 형식 */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2.5 border-b border-border bg-secondary/50 px-5 py-3">
              <span className="size-2 rounded-full bg-primary" aria-hidden />
              <span className="truncate font-mono text-[12px] text-text-secondary">
                woojudealer.com/c/e91046ad…
              </span>
            </div>

            <div className="px-6 py-6">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-[15px] font-bold text-foreground">보안삭제 인증서</span>
                <span className="rounded-full bg-brand-green-soft px-3 py-1 font-mono text-[11.5px] font-semibold text-primary">
                  검증됨
                </span>
              </div>

              <dl className="space-y-2.5">
                {VERIFY_ROWS.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-border/60 pb-2.5 text-[13px]">
                    <dt className="text-text-muted">{k}</dt>
                    <dd className="text-right font-mono text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-5 text-[12px] leading-relaxed text-text-muted">
                위 기기는 DoD 5220.22-M 표준에 따라 데이터가 복구 불가능하도록
                삭제되었으며, 본 인증서는 해당 처리가 적법하게 완료되었음을 증명합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── 실적 ───────────────── */}
      <section className="bg-card py-16 md:py-24">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 md:px-10">
          <div className="mb-12 max-w-[720px]">
            <Eyebrow>근거</Eyebrow>
            <h2 className="mb-4 text-[28px] font-black leading-tight tracking-[-0.02em] text-foreground md:text-[38px]">
              맨땅에서 시작하지 않았습니다
            </h2>
            <p className="text-[15px] leading-relaxed text-text-secondary">
              전국 협력점과 22년치 거래처가 이미 자리 잡고 있습니다. 새로 지은 것은
              그 위에 올린 플랫폼뿐입니다.
            </p>
          </div>

          {/* 카드 대신 사실 목록으로 둔다 — 앞 두 섹션이 이미 카드 그리드다 */}
          <dl className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
            {TRACK_RECORD.map((r) => (
              <div key={r.label} className="bg-background p-6">
                <r.icon className="mb-4 size-5 text-text-muted" aria-hidden />
                <dt className="text-[13px] font-bold text-text-secondary">{r.label}</dt>
                <dd>
                  <div className="mt-1 text-[26px] font-black leading-none text-foreground md:text-[30px]">
                    {r.value}
                  </div>
                  <p className="mt-2.5 text-[12px] leading-relaxed text-text-muted">{r.desc}</p>
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 font-mono text-[12px] text-text-muted">
            부품 호환성 자동 매칭 특허출원 4-2023-071209-7
          </p>
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
            수량만 알려주세요
          </h2>
          <p className="mb-9 text-[16px] leading-relaxed text-text-secondary">
            가까운 협력점이 방문합니다. 수거 비용은 받지 않습니다.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="cta" size="lg">
              <Link href={requestHref}>
                무료 수거 신청 <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/estimate">견적부터 받아보기</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
