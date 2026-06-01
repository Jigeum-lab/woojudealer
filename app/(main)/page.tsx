"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircuitBoard,
  Coins,
  Cpu,
  Fan,
  FileCheck2,
  HardDrive,
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
  { type: "svg" as const, src: "/wooju/parts/cpu.svg" },
  { type: "icon" as const, Icon: CircuitBoard },
  { type: "icon" as const, Icon: MemoryStick },
  { type: "icon" as const, Icon: Monitor },
  { type: "svg" as const, src: "/wooju/parts/HDD.svg" },
  { type: "svg" as const, src: "/wooju/parts/SSD.svg" },
  { type: "icon" as const, Icon: Power },
  { type: "icon" as const, Icon: Server },
  { type: "icon" as const, Icon: Fan },
];

const VALUES = [
  {
    icon: Zap,
    metric: "24h",
    color: "text-primary",
    title: "원스톱 속도",
    desc: "신청 후 24시간 내 픽업, 48시간 내 보안삭제 완료. 업무 공백을 최소화합니다.",
    bar: "bg-primary",
  },
  {
    icon: Radar,
    metric: "100%",
    color: "text-primary",
    title: "실시간 투명성",
    desc: "수거→삭제→인증까지 모든 단계를 실시간 추적. QR 코드 검증 인증서를 발급합니다.",
    bar: "bg-primary",
  },
  {
    icon: Coins,
    metric: "40x",
    color: "text-primary",
    title: "비용 절감",
    desc: "기존 5천원짜리 폐기 비용 대신, 대당 최대 20만원의 회수 가치를 창출합니다.",
    bar: "bg-primary",
  },
  {
    icon: Leaf,
    metric: "ESG",
    color: "text-primary",
    title: "환경 기여",
    desc: "탄소 절감 수치와 처리 이력을 ESG 보고서 형태로 즉시 제공합니다.",
    bar: "bg-primary",
  },
];

const PROCESS = [
  { icon: Truck, bg: "bg-brand-green-soft text-primary", name: "수거", desc: "24시간 내 픽업" },
  {
    icon: ShieldCheck,
    bg: "bg-brand-green-soft text-primary",
    name: "보안삭제",
    desc: "DoD 5220.22-M",
  },
  {
    icon: Recycle,
    bg: "bg-brand-green-soft text-primary",
    name: "리퍼·업사이클",
    desc: "자원 가치화",
  },
  {
    icon: FileCheck2,
    bg: "bg-brand-green-soft text-primary",
    name: "인증서 발급",
    desc: "PDF 즉시 다운로드",
  },
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
  const requestHref = user
    ? "/requests/new"
    : "/login?return_to=%2Frequests%2Fnew";

  return (
    <>
      {/* Hero — 다크 + 네온 그린 (기존 우주딜러 OG 톤) */}
      <section className="relative overflow-hidden bg-background py-24 text-center">
        {/* 글로우 백드롭 */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 size-[720px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/15 blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-[1280px] px-10">
          <div className="mb-6 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-primary/30 bg-brand-green-soft px-3.5 py-1.5 text-[13px] font-semibold text-primary">
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            DoD 5220.22-M 미 국방부 표준 적용
          </div>
          <h1 className="mb-5 text-[56px] font-black leading-[1.15] tracking-[-0.02em] text-foreground">
            전화 한 통으로, 24시간 내에,
            <br />
            폐PC의{" "}
            <span className="text-primary [text-shadow:0_0_32px_rgba(0,213,99,0.4)]">
              100%를 가치화
            </span>
            한다
          </h1>
          <p className="mx-auto mb-10 max-w-[680px] text-lg text-text-secondary">
            B2B 폐PC 원스톱 업사이클링 플랫폼 — 수거에서 보안삭제 인증서까지
          </p>
          <div className="mb-14 flex justify-center gap-3">
            <Button asChild variant="cta" size="xl">
              <Link href={requestHref}>
                무료 수거 신청 <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#process">서비스 소개 보기</Link>
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[13px] text-text-muted">
            {TRUST.map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-2.5 stroke-[3]" />
                </span>
                {t}
              </div>
            ))}
          </div>

          {/* OG 톤 라인아트 부품 띠 */}
          <div className="mt-16 flex items-center justify-center gap-7 text-primary/80">
            {PART_ICONS.map((p, i) =>
              p.type === "svg" ? (
                <Image
                  key={i}
                  src={p.src}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 opacity-90 transition-opacity hover:opacity-100"
                />
              ) : (
                <p.Icon
                  key={i}
                  className="size-8 opacity-90 transition-opacity hover:opacity-100"
                  strokeWidth={1.5}
                />
              )
            )}
          </div>
        </div>
      </section>

      {/* Value cards */}
      <section className="bg-card py-[72px]">
        <div className="mx-auto max-w-[1280px] px-10">
          <SectionHeader
            eyebrow="핵심 가치"
            title="왜 우주딜러인가요?"
            sub="기업의 폐PC를 책임감 있게 처리하는 유일한 원스톱 플랫폼"
          />
          <div className="grid grid-cols-4 gap-4">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="group relative overflow-hidden rounded-xl border border-border bg-background p-7 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_0_32px_-8px_rgba(0,213,99,0.4)]"
              >
                <span className={`absolute inset-x-0 top-0 h-[2px] ${v.bar}`} />
                <v.icon className={`mb-4 size-8 ${v.color}`} strokeWidth={2} />
                <div className={`mb-1.5 text-4xl font-black leading-none ${v.color}`}>
                  {v.metric}
                </div>
                <div className="mb-2 text-base font-bold">{v.title}</div>
                <p className="text-[13px] leading-relaxed text-text-secondary">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section id="process" className="bg-background py-[72px]">
        <div className="mx-auto max-w-[1280px] px-10">
          <SectionHeader
            eyebrow="처리 프로세스"
            title="4단계 원스톱 처리"
            sub="신청부터 인증서 발급까지 모든 과정을 추적할 수 있습니다"
          />
          <div className="rounded-xl border border-border bg-card p-10">
            <div className="flex items-center">
              {PROCESS.map((p, i) => (
                <div key={p.name} className="relative flex-1 px-3 text-center">
                  <div
                    className={`mx-auto mb-2.5 flex size-14 items-center justify-center rounded-2xl ring-1 ring-primary/20 ${p.bg}`}
                  >
                    <p.icon className="size-6" />
                  </div>
                  <div className="mb-1 text-sm font-bold text-foreground">
                    {p.name}
                  </div>
                  <div className="text-xs text-text-muted">{p.desc}</div>
                  {i < PROCESS.length - 1 && (
                    <ArrowRight className="absolute -right-2.5 top-7 size-5 text-text-muted" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-card py-20 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1280px] px-10">
          <h2 className="mb-3.5 text-[38px] font-black tracking-[-0.01em] text-foreground">
            지금 바로 무료로 시작하세요
          </h2>
          <p className="mb-9 text-[17px] text-text-secondary">
            견적 문의부터 인증서 발급까지, 모든 것이 무료입니다
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild variant="cta" size="xl">
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
      <h2 className="mb-3.5 text-[32px] font-extrabold tracking-[-0.01em] text-foreground">
        {title}
      </h2>
      <p className="text-base text-text-secondary">{sub}</p>
    </div>
  );
}
