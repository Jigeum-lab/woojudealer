"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircuitBoard,
  Coins,
  Fan,
  FileCheck2,
  Leaf,
  MemoryStick,
  Monitor,
  Power,
  Radar,
  Recycle,
  Server,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";

const PART_ICONS = [
  { type: "svg" as const, src: "/wooju/parts/cpu.svg", label: "CPU" },
  { type: "icon" as const, Icon: CircuitBoard, label: "메인보드" },
  { type: "icon" as const, Icon: MemoryStick, label: "RAM" },
  { type: "icon" as const, Icon: Monitor, label: "모니터" },
  { type: "svg" as const, src: "/wooju/parts/HDD.svg", label: "HDD" },
  { type: "svg" as const, src: "/wooju/parts/SSD.svg", label: "SSD" },
  { type: "icon" as const, Icon: Power, label: "파워" },
  { type: "icon" as const, Icon: Server, label: "서버" },
  { type: "icon" as const, Icon: Fan, label: "쿨러" },
];

const VALUES = [
  {
    icon: Zap,
    metric: "24h",
    title: "원스톱 속도",
    desc: "신청 후 24시간 내 픽업, 48시간 내 보안삭제 완료. 업무 공백을 최소화합니다.",
    span: "sm:col-span-2",
  },
  {
    icon: Radar,
    metric: "100%",
    title: "실시간 투명성",
    desc: "수거→삭제→인증까지 모든 단계를 실시간 추적. QR 코드 검증 인증서를 발급합니다.",
    span: "",
  },
  {
    icon: Coins,
    metric: "40x",
    title: "비용 절감",
    desc: "기존 5천원짜리 폐기 비용 대신, 대당 최대 20만원의 회수 가치를 창출합니다.",
    span: "",
  },
  {
    icon: Leaf,
    metric: "ESG",
    title: "환경 기여",
    desc: "탄소 절감 수치와 처리 이력을 ESG 보고서 형태로 즉시 제공합니다.",
    span: "sm:col-span-2",
  },
];

const PROCESS = [
  { icon: Truck, step: "01", name: "수거", desc: "신청 후 24시간 내 픽업" },
  { icon: ShieldCheck, step: "02", name: "보안삭제", desc: "DoD 5220.22-M 표준 적용" },
  { icon: Recycle, step: "03", name: "리퍼·업사이클", desc: "자원 최대 가치화" },
  { icon: FileCheck2, step: "04", name: "인증서 발급", desc: "법적 효력 PDF 즉시 발급" },
];

const TRUST_STRIP = [
  { icon: ShieldCheck, label: "DoD 5220.22-M 인증" },
  { icon: ShieldCheck, label: "개인정보보호법 준수" },
  { icon: Leaf, label: "ESG 보고서 지원" },
  { icon: FileCheck2, label: "법적 효력 인증서" },
];

const TRUST = ["24시간 내 픽업", "보안삭제 인증서 발급", "ESG 보고서 지원", "무료 서비스"];

const CERT_BADGES = [
  "DoD 5220.22-M 인증",
  "개인정보보호법 준수",
  "ESG 보고서 지원",
  "법적 효력 인증서",
];

export default function LandingPage() {
  const { user } = useAuth();
  const requestHref = user ? "/requests/new" : "/login?return_to=%2Frequests%2Fnew";

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-background py-16 text-center md:py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 size-[860px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/10 blur-[160px]" />
          <div className="absolute left-[18%] top-[55%] size-[360px] -translate-y-1/2 rounded-full bg-primary/6 blur-[100px]" />
          <div className="absolute right-[18%] top-[45%] size-[280px] -translate-y-1/2 rounded-full bg-primary/5 blur-[80px]" />
          <div
            className="absolute inset-0 opacity-[0.032]"
            style={{
              backgroundImage:
                "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 md:px-10">
          {/* Pill — animated ping */}
          <div className="mb-7 inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-primary/30 bg-brand-green-soft px-4 py-2 text-[13px] font-semibold text-primary">
            <span className="relative flex size-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex size-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            수거 → 인증서까지 평균 48시간 완료
          </div>

          {/* H1 — SDSwagger on "100%를 가치화" */}
          <h1 className="mb-5 text-[32px] font-black leading-[1.15] tracking-[-0.025em] text-foreground sm:text-[44px] md:text-[60px] md:leading-[1.1]">
            전화 한 통으로, 24시간 내에,
            <br />
            폐PC의{" "}
            <span
              className="text-primary"
              style={{
                fontFamily: "SDSwagger",
                textShadow:
                  "0 0 40px rgba(0,213,99,0.5), 0 0 80px rgba(0,213,99,0.2)",
              }}
            >
              100%를 가치화
            </span>
            한다
          </h1>

          <p className="mx-auto mb-10 max-w-[620px] text-lg leading-relaxed text-text-secondary">
            B2B 폐PC 원스톱 업사이클링 플랫폼 — 수거에서 보안삭제 인증서까지
          </p>

          <div className="mb-14 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="cta" size="lg">
              <Link href={requestHref}>
                무료 수거 신청 <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#process">서비스 소개 보기</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[13px] text-text-muted">
            {TRUST.map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-2.5 stroke-[3]" />
                </span>
                {t}
              </div>
            ))}
          </div>

          {/* Parts strip — labeled chips */}
          <div className="mt-12 -mx-4 overflow-x-auto px-4 md:mt-16 md:mx-0 md:overflow-visible md:px-0">
          <div className="flex w-max items-end justify-center gap-3 md:w-auto md:gap-4">
            {PART_ICONS.map((p, i) => (
              <div key={i} className="group flex flex-col items-center gap-2">
                <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-card/60 text-primary/50 backdrop-blur-sm transition-all group-hover:border-primary/40 group-hover:bg-brand-green-soft group-hover:text-primary">
                  {p.type === "svg" ? (
                    <Image
                      src={p.src}
                      alt={p.label}
                      width={24}
                      height={24}
                      className="size-6 opacity-70 transition-opacity group-hover:opacity-100"
                    />
                  ) : (
                    <p.Icon className="size-6" strokeWidth={1.5} />
                  )}
                </div>
                <span className="text-[10px] text-text-muted transition-colors group-hover:text-primary/80">
                  {p.label}
                </span>
              </div>
            ))}
          </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <div className="border-y border-border bg-card py-4">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-10">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-center sm:divide-x sm:divide-border sm:gap-0">
            {TRUST_STRIP.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 text-xs text-text-muted sm:px-8 sm:text-sm sm:first:pl-0 sm:last:pr-0"
              >
                <Icon className="size-4 shrink-0 text-primary/60" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Values — Bento ── */}
      <section className="bg-card py-12 md:py-[72px]">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-10">
          <SectionHeader
            eyebrow="핵심 가치"
            title="왜 우주딜러인가요?"
            sub="기업의 폐PC를 책임감 있게 처리하는 유일한 원스톱 플랫폼"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {VALUES.map((v) => (
              <ValueCard key={v.title} {...v} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Process ── */}
      <section id="process" className="bg-background py-12 md:py-[72px]">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-10">
          <SectionHeader
            eyebrow="처리 프로세스"
            title="4단계 원스톱 처리"
            sub="신청부터 인증서 발급까지 모든 과정을 추적할 수 있습니다"
          />
          <div className="relative grid grid-cols-2 gap-4 md:grid-cols-4">
            {/* Connecting gradient line — desktop only */}
            <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-7 hidden h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent md:block" />
            {PROCESS.map((p) => (
              <div
                key={p.name}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 text-center transition-all hover:border-primary/30 hover:shadow-[0_0_32px_-8px_rgba(0,213,99,0.35)]"
              >
                {/* Background step number */}
                <div
                  className="pointer-events-none absolute -right-2 -top-4 select-none text-[88px] font-black leading-none text-primary/[0.05]"
                  style={{ fontFamily: "SDSwagger" }}
                >
                  {p.step}
                </div>
                {/* Icon */}
                <div className="relative mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-green-soft text-primary ring-1 ring-primary/20 transition-all group-hover:ring-primary/40">
                  <p.icon className="size-6" />
                </div>
                <div className="mb-1.5 text-sm font-bold text-foreground">{p.name}</div>
                <div className="text-xs leading-relaxed text-text-muted">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden bg-card py-14 text-center md:py-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 size-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/14 blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.022]"
            style={{
              backgroundImage:
                "radial-gradient(circle, var(--border-strong) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>
        <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 md:px-10">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-brand-green-soft text-primary ring-1 ring-primary/20">
            <ShieldCheck className="size-7" />
          </div>
          <h2 className="mb-3.5 text-[26px] font-black tracking-[-0.01em] text-foreground md:text-[38px]">
            지금 바로 무료로 시작하세요
          </h2>
          <p className="mb-9 text-base text-text-secondary md:text-[17px]">
            견적 문의부터 인증서 발급까지, 모든 것이 무료입니다
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="cta" size="lg">
              <Link href={requestHref}>지금 무료로 견적 받기</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/support">FAQ 보기</Link>
            </Button>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {CERT_BADGES.map((b) => (
              <span
                key={b}
                className="rounded-full border border-primary/30 bg-brand-green-soft px-3.5 py-1.5 text-xs font-semibold text-primary"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

function ValueCard({
  icon: Icon,
  metric,
  title,
  desc,
  span = "",
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  metric: string;
  title: string;
  desc: string;
  span?: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-border bg-background p-7 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_0_44px_-10px_rgba(0,213,99,0.45)] ${span}`}
    >
      {/* Top accent — fades in on hover */}
      <span className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Background watermark */}
      <div
        className="pointer-events-none absolute -right-3 -top-5 select-none text-[100px] font-black leading-none text-primary/[0.04]"
        style={{ fontFamily: "SDSwagger" }}
      >
        {metric}
      </div>

      {/* Content */}
      <div className="relative">
        <Icon className="mb-4 size-8 text-primary" strokeWidth={2} />
        <div
          className="mb-2 text-[48px] font-black leading-none text-primary"
          style={{
            fontFamily: "SDSwagger",
            textShadow: "0 0 32px rgba(0,213,99,0.28)",
          }}
        >
          {metric}
        </div>
        <div className="mb-2.5 text-base font-bold text-foreground">{title}</div>
        <p className="text-[13px] leading-relaxed text-text-secondary">{desc}</p>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="mb-12 text-center">
      <div className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-primary">
        {eyebrow}
      </div>
      <h2 className="mb-3.5 text-[22px] font-extrabold tracking-[-0.01em] text-foreground md:text-[32px]">
        {title}
      </h2>
      <p className="text-base text-text-secondary">{sub}</p>
    </div>
  );
}
