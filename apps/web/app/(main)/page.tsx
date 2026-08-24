"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ChevronRight,
  ClipboardList,
  Cpu,
  FlaskConical,
  HelpCircle,
  ListChecks,
  Network,
  Truck,
  TvMinimalPlay,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useMode } from "@/lib/mode-context";
import {
  discountRate,
  fetchPublicTemplates,
  type PublicTemplate,
} from "@/lib/db/templates-public";
import { formatWon } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ExplodedDiagram } from "@/components/landing/exploded-diagram";
import { PartImage } from "@/components/inquiry/part-image";
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

/**
 * 랜딩은 성격이 다른 두 손님을 동시에 받는다.
 *   sell — 폐PC를 처분하려는 기업 담당자 (수거·삭제·증명)
 *   buy  — 되살린 PC를 사려는 사람 (견적·구성)
 * 둘은 필요한 근거가 달라서 한 화면에 욱여넣으면 양쪽 다 흐려진다.
 * 그래서 히어로에서 갈라주고 아래 섹션 전체를 바꾼다.
 */
type Mode = "sell" | "buy";

const HERO: Record<
  Mode,
  { eyebrow: string; lines: string[]; accent: string; body: string; stats: [string, string][] }
> = {
  sell: {
    eyebrow: "기업 · PC방 · 공공기관 폐PC 원스톱",
    lines: ["수거하고, 지우고,", "증명하고,"],
    accent: "다시 팝니다",
    body: "고물상에 넘기면 대당 5,000원입니다. 우주딜러는 저장장치를 국제표준으로 지우고 인증서를 발급한 뒤, 살아있는 부품으로 값을 되찾아 돌려드립니다.",
    stats: [
      ["24시간", "내 수거"],
      ["DoD 5220.22-M", "국제표준 삭제"],
      ["QR 검증", "누구나 조회"],
    ],
  },
  buy: {
    eyebrow: "사무용 · PC방 · 공공기관 재생 PC",
    lines: ["버려진 부품으로", "제대로 된 PC를"],
    accent: "맞춥니다",
    body: "수거한 PC에서 살아있는 부품만 골라 검증하고 다시 조립합니다. 부품을 직접 고르면 호환성과 금액이 그 자리에서 나옵니다.",
    stats: [
      ["695개", "부품 재고"],
      ["자동 검증", "호환성 21개 분류"],
      ["국가공인 1급", "PC 정비사가 조립"],
    ],
  },
};


/**
 * 구매 쪽 본문.
 *
 * 파는 쪽이 '증빙'으로 설득한다면 이쪽은 '실물'로 설득한다.
 * 추천 사양은 관리자가 실제로 쓰는 템플릿을 그대로 읽어온다 — 단가를 고치면
 * 여기 금액도 따라 바뀐다. 부품 사진도 재고에 등록된 실제 사진이다.
 */
/** 카드에 크게 보여줄 세 줄. 컴퓨존식으로 CPU·RAM·VGA만 뽑는다. */
const SPEC_ROWS = [
  { category: "cpu", label: "CPU" },
  { category: "memory", label: "RAM" },
  { category: "gpu", label: "VGA" },
] as const;

/** 대표 사진은 그래픽카드 > CPU > 케이스 순으로 고른다 — 가장 눈에 띄는 부품부터. */
const THUMB_ORDER = ["gpu", "cpu", "case"] as const;

/**
 * 추천 사양 카드 한 장.
 *
 * 정가(list_price)를 매긴 부품이 하나도 없으면 할인 표기가 통째로 빠진다.
 * 정가 없이 할인율만 그리면 없는 할인을 있는 것처럼 보이게 되기 때문이다.
 */
function TemplateCard({ template: t }: { template: PublicTemplate }) {
  const rate = discountRate(t.total, t.listTotal);
  const thumb =
    THUMB_ORDER.map((c) => t.items.find((it) => it.category === c)).find(
      (it) => it?.imageUrl
    ) ?? t.items[0];

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 md:flex-row md:items-center md:gap-6 md:p-6">
      {/* 대표 사진 */}
      <div className="flex shrink-0 items-center justify-center self-start rounded-lg bg-secondary p-3 md:self-center">
        <PartImage
          src={thumb?.imageUrl ?? null}
          alt={t.name}
          category={thumb?.category ?? "case"}
          size={96}
        />
      </div>

      {/* 이름 + 사양 표 */}
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="text-[17px] font-bold text-foreground">{t.name}</h3>
          {t.tag && (
            <span className="rounded border border-border px-1.5 py-0.5 text-[11px] font-semibold text-text-muted">
              {t.tag}
            </span>
          )}
        </div>

        <dl className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {SPEC_ROWS.map(({ category, label }) => {
            const item = t.items.find((it) => it.category === category);
            return (
              <div key={category} className="flex items-center gap-3 px-3 py-2">
                <dt className="w-12 shrink-0 text-[11.5px] font-bold text-text-muted">
                  {label}
                </dt>
                <dd className="min-w-0 flex-1 truncate text-[12.5px] text-text-secondary">
                  {item ? item.name : category === "gpu" ? "내장그래픽" : "—"}
                </dd>
              </div>
            );
          })}
        </dl>

        {t.items.length > SPEC_ROWS.length && (
          <p className="mt-2 text-[12px] text-text-muted">
            외 {t.items.length - SPEC_ROWS.length}개 품목 포함
          </p>
        )}
      </div>

      {/* 가격 + CTA */}
      <div className="shrink-0 border-t border-border pt-4 md:w-[220px] md:border-l md:border-t-0 md:pl-6 md:pt-0">
        {rate > 0 && (
          <div className="mb-0.5 flex items-baseline gap-2">
            <span className="text-[17px] font-black text-destructive">{rate}%</span>
            <s className="font-mono text-[13px] text-text-muted">
              {formatWon(t.listTotal)}
            </s>
          </div>
        )}
        <div className="mb-1 font-mono text-[22px] font-extrabold text-primary">
          {formatWon(t.total)}
        </div>
        <p className="mb-3 text-[11.5px] text-text-muted">VAT 별도</p>
        <Button asChild variant="cta" className="w-full">
          <Link href={`/estimate/pc?template=${t.id}`}>이 사양으로 시작하기</Link>
        </Button>
      </div>
    </div>
  );
}

function BuySections() {
  const [templates, setTemplates] = useState<PublicTemplate[]>([]);
  const [ready, setReady] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setReady(true));
  }, []);

  const tags = useMemo(
    () =>
      Array.from(
        new Set(templates.map((t) => t.tag).filter((v): v is string => !!v))
      ),
    [templates]
  );
  const shown = useMemo(
    () => (activeTag ? templates.filter((t) => t.tag === activeTag) : templates),
    [templates, activeTag]
  );

  return (
    <>
      {/* 추천 사양 */}
      <section className="border-b border-border bg-background py-16 md:py-24">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 md:px-10">
          <div className="mb-10 max-w-[660px]">
            <Eyebrow>추천 사양</Eyebrow>
            <h2 className="mb-4 text-[28px] font-black leading-tight tracking-[-0.02em] text-foreground md:text-[38px]">
              고민되시면
              <br />
              이 중에 고르셔도 됩니다
            </h2>
            <p className="text-[15px] leading-relaxed text-text-secondary">
              용도별로 미리 맞춰둔 구성입니다. 그대로 요청하셔도 되고, 마음에 안 드는
              부품만 바꾸셔도 됩니다.
            </p>
          </div>

          {/* 탭 — 분류(tag)를 매긴 구성이 있을 때만 나온다 */}
          {tags.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              {[null, ...tags].map((tag) => (
                <button
                  key={tag ?? "all"}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className={
                    activeTag === tag
                      ? "rounded-full bg-foreground px-4 py-2 text-[13px] font-bold text-background"
                      : "rounded-full border border-border px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-foreground"
                  }
                >
                  {tag ?? "전체"}
                </button>
              ))}
            </div>
          )}

          {!ready ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-44 animate-pulse rounded-xl border border-border bg-card"
                />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-strong bg-card p-8 text-center text-sm text-text-muted">
              추천 사양을 불러오지 못했습니다. 구성기에서 직접 담아보실 수 있습니다.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {shown.map((t) => (
                <TemplateCard key={t.id} template={t} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 왜 믿을 수 있나 */}
      <section className="bg-card py-16 md:py-24">
        <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 sm:px-6 md:px-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <Eyebrow>왜 싼가</Eyebrow>
            <h2 className="mb-4 text-[28px] font-black leading-tight tracking-[-0.02em] text-foreground md:text-[38px]">
              부품값이 이미
              <br />
              한 번 회수됐기 때문입니다
            </h2>
            <p className="mb-7 text-[15px] leading-relaxed text-text-secondary">
              기업에서 수거한 PC에서 동작하는 부품만 골라냅니다. 새로 사올 필요가 없으니
              그만큼 값이 내려갑니다. 싸게 파는 게 아니라 원가가 다른 것입니다.
            </p>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-5 border-t border-border pt-6">
              {[
                ["동작 검증", "부품마다 확인 후 등록"],
                ["호환성 자동 검사", "조립 안 되는 구성은 발행 차단"],
                ["국가공인 1급 PC 정비사", "대표가 직접 조립·검수"],
                ["21개 분류", "695개 부품에서 구성"],
              ].map(([t, d]) => (
                <div key={t}>
                  <dt className="text-[14px] font-bold text-foreground">{t}</dt>
                  <dd className="mt-1 text-[12.5px] leading-relaxed text-text-muted">{d}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* 호환성 판정 — 구성기가 실제로 내보내는 문구 */}
          <div className="rounded-xl border border-border bg-background">
            <div className="border-b border-border px-5 py-3.5">
              <span className="font-mono text-[12px] tracking-wide text-text-muted">
                호환성 검증
              </span>
            </div>
            <ul className="divide-y divide-border/60">
              {[
                {
                  ok: false,
                  head: "마더보드가 지원하지 않는 메모리 규격입니다",
                  body: "마더보드는 DDR5만 지원하는데 선택한 메모리는 DDR4 입니다.",
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
              ].map((c) => (
                <li key={c.head} className="flex gap-3 px-5 py-4">
                  <span
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                      c.ok ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {c.ok ? "\u2713" : "\u2715"}
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
                부품 호환성 자동 매칭 특허출원 4-2023-071209-7
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

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

  // 전환은 헤더 토글이 담당한다. 랜딩은 그 값을 받아 본문만 바꾼다.
  const { mode } = useMode();

  const hero = HERO[mode];

  return (
    <>
      {/* ───────────────── 인트로 (짧게) ───────────────── */}
      <section className="relative isolate overflow-hidden border-b border-border">
        {mode === "sell" ? (
          <>
            <Image
              src="/wooju/landing/hero-bg.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="-z-10 object-cover object-center"
            />
            <div aria-hidden className="absolute inset-0 -z-10 bg-background/55" />
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-gradient-to-b from-background/80 via-transparent to-background"
            />
          </>
        ) : (
          <div
            aria-hidden
            className="absolute left-1/2 top-0 -z-10 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[130px]"
          />
        )}

        {/* 소개는 짧게 끝낸다 — 첫 화면은 '뭘 할 수 있나'가 차지해야 한다 */}
        <div className="relative mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6 md:px-10 md:py-14">
          <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.18em] text-white/70">
            {hero.eyebrow}
          </p>
          <h1 className="mb-3 text-[26px] font-black leading-[1.2] tracking-[-0.02em] text-white sm:text-[32px] md:text-[38px]">
            {hero.lines.join(" ")}{" "}
            <span className="text-primary" style={{ fontFamily: "var(--font-display)" }}>
              {hero.accent}
            </span>
          </h1>
          <p className="max-w-[600px] text-[15px] leading-relaxed text-white/85">
            {hero.body}
          </p>

          <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
            {hero.stats.map(([v, l]) => (
              <div key={l} className="flex items-baseline gap-1.5">
                <dt className="font-mono text-[14px] font-semibold text-foreground">{v}</dt>
                <dd className="text-[12.5px] text-text-muted">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ───────────────── 바로 할 수 있는 것 ───────────────── */}
      <section className="border-b border-border bg-background py-10 md:py-14">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 md:px-10">
          <h2 className="mb-5 text-[20px] font-bold text-foreground md:text-[22px]">
            {mode === "buy" ? "PC가 필요하시면" : "폐PC 처분이 필요하실 때"}
          </h2>

          {/* 주 행동 하나를 크게 — 나머지는 아래 작은 카드로 */}
          <Link
            href={mode === "buy" ? "/estimate/pc" : requestHref}
            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 md:gap-5 md:p-6"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-green-soft text-primary md:size-14">
              {mode === "buy" ? <Cpu className="size-6" /> : <Truck className="size-6" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-bold text-foreground md:text-[18px]">
                {mode === "buy" ? "부품 직접 골라 견적" : "수거 신청하기"}
              </span>
              <span className="mt-1 block text-[13px] leading-relaxed text-text-secondary md:text-[13.5px]">
                {mode === "buy"
                  ? "호환성과 금액이 그 자리에서 계산됩니다. 가입 없이 담아보셔도 됩니다."
                  : "수량만 알려주시면 협력점이 방문합니다. 수거 비용은 받지 않습니다."}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-text-muted transition-colors group-hover:text-primary" />
          </Link>

          {mode === "buy" && (
            <div className="mt-3 rounded-xl border border-border bg-card p-5 md:p-6">
              <p className="mb-4 text-[14px] font-bold text-text-secondary">
                고르기 어려우시면 추천 사양으로
              </p>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {["가성비형", "중급형", "고급형"].map((n) => (
                  <Link
                    key={n}
                    href="/estimate/pc"
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-[14px] font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    {n}
                    <ChevronRight className="size-4 text-text-muted" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 보조 행동 */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(mode === "buy"
              ? [
                  { href: "/estimate/buy", icon: ListChecks, label: "용도·예산만 남기기", desc: "저희가 구성해 견적서를 보내드립니다" },
                  { href: "/support", icon: HelpCircle, label: "자주 묻는 질문", desc: "결제·납기가 궁금하시면" },
                ]
              : [
                  { href: "/estimate/sell", icon: Wallet, label: "얼마 받는지 먼저 확인", desc: "가입 없이 수량만 알려주셔도 됩니다" },
                  { href: "/requests", icon: ClipboardList, label: "내 신청 현황", desc: "진행 단계·인증서·정산 보기" },
                ]
            ).map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group flex items-center gap-3.5 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/50"
              >
                <a.icon className="size-5 shrink-0 text-text-muted transition-colors group-hover:text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold text-foreground">{a.label}</span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-text-muted">{a.desc}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-text-muted transition-colors group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {mode === "sell" ? (
        <>
      {/* ───────────────── 분해도 ───────────────── */}
      <section className="border-b border-border bg-background py-16 md:py-24">
        <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 sm:px-6 md:px-10 lg:grid-cols-2 lg:items-center lg:gap-16">
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
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 md:px-10">
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
        <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 sm:px-6 md:px-10 lg:grid-cols-2 lg:items-center lg:gap-16">
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
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 md:px-10">
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

        </>
      ) : (
        <BuySections />
      )}

      {/* ───────────────── CTA ───────────────── */}
      <section className="relative overflow-hidden border-t border-border bg-background py-16 text-center md:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[130px]"
        />
        <div className="relative mx-auto max-w-[720px] px-4 sm:px-6">
          <h2 className="mb-4 text-[28px] font-black leading-tight tracking-[-0.02em] text-foreground md:text-[40px]">
            {mode === "sell" ? "수량만 알려주세요" : "먼저 담아만 보셔도 됩니다"}
          </h2>
          <p className="mb-9 text-[16px] leading-relaxed text-text-secondary">
            {mode === "sell"
              ? "가까운 협력점이 방문합니다. 수거 비용은 받지 않습니다."
              : "가입도 결제도 없습니다. 구성해두시면 저희가 확인해 정식 견적서를 보내드립니다."}
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="cta" size="lg">
              <Link href={mode === "sell" ? requestHref : "/estimate/pc"}>
                {mode === "sell" ? "무료 수거 신청" : "견적 짜보기"}
                <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={mode === "sell" ? "/estimate" : "/support"}>
                {mode === "sell" ? "견적부터 받아보기" : "자주 묻는 질문"}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

