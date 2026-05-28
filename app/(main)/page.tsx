"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  Coins,
  FileCheck2,
  Leaf,
  Radar,
  Recycle,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";

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
    color: "text-cta",
    title: "실시간 투명성",
    desc: "수거→삭제→인증까지 모든 단계를 실시간 추적. QR 코드 검증 인증서를 발급합니다.",
    bar: "bg-cta",
  },
  {
    icon: Coins,
    metric: "40x",
    color: "text-success",
    title: "비용 절감",
    desc: "기존 5천원짜리 폐기 비용 대신, 대당 최대 20만원의 회수 가치를 창출합니다.",
    bar: "bg-success",
  },
  {
    icon: Leaf,
    metric: "ESG",
    color: "text-violet-500",
    title: "환경 기여",
    desc: "탄소 절감 수치와 처리 이력을 ESG 보고서 형태로 즉시 제공합니다.",
    bar: "bg-violet-500",
  },
];

const PROCESS = [
  { icon: Truck, bg: "bg-blue-50 text-primary", name: "수거", desc: "24시간 내 픽업" },
  {
    icon: ShieldCheck,
    bg: "bg-amber-50 text-amber-600",
    name: "보안삭제",
    desc: "DoD 5220.22-M",
  },
  {
    icon: Recycle,
    bg: "bg-green-50 text-success",
    name: "리퍼·업사이클",
    desc: "자원 가치화",
  },
  {
    icon: FileCheck2,
    bg: "bg-violet-50 text-violet-500",
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
      {/* Hero */}
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#EFF6FF_0%,#F8FAFC_50%,#FFF7ED_100%)] py-24 text-center">
        <div className="relative z-10 mx-auto max-w-[1280px] px-10">
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-[13px] font-semibold text-primary shadow-sm">
            <span className="size-1.5 rounded-full bg-success" />
            DoD 5220.22-M 미 국방부 표준 적용
          </div>
          <h1 className="mb-5 text-[56px] font-extrabold leading-[1.15] tracking-[-0.02em] text-foreground">
            전화 한 통으로, 24시간 내에,
            <br />
            폐PC의 <span className="text-primary">100%를 가치화</span>한다
          </h1>
          <p className="mx-auto mb-10 max-w-[520px] text-lg text-text-secondary">
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
          <div className="flex items-center justify-center gap-6 text-[13px] text-text-muted">
            {TRUST.map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <span className="flex size-4 items-center justify-center rounded-full bg-success text-white">
                  <Check className="size-2.5 stroke-[3]" />
                </span>
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value cards */}
      <section className="bg-white py-[72px]">
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
                className="relative overflow-hidden rounded-xl border-[1.5px] border-border bg-background p-7 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className={`absolute inset-x-0 top-0 h-[3px] ${v.bar}`} />
                <v.icon className={`mb-4 size-8 ${v.color}`} strokeWidth={2} />
                <div className={`mb-1.5 text-4xl font-extrabold leading-none ${v.color}`}>
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
          <div className="rounded-xl border border-border bg-white p-10 shadow-md">
            <div className="flex items-center">
              {PROCESS.map((p, i) => (
                <div key={p.name} className="relative flex-1 px-3 text-center">
                  <div
                    className={`mx-auto mb-2.5 flex size-14 items-center justify-center rounded-2xl ${p.bg}`}
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
      <section className="bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] py-20 text-center text-white">
        <div className="mx-auto max-w-[1280px] px-10">
          <h2 className="mb-3.5 text-[38px] font-extrabold tracking-[-0.01em]">
            지금 바로 무료로 시작하세요
          </h2>
          <p className="mb-9 text-[17px] opacity-85">
            견적 문의부터 인증서 발급까지, 모든 것이 무료입니다
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild variant="white" size="xl">
              <Link href={requestHref}>지금 무료로 견적 받기</Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="border-[1.5px] border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <Link href="/support">FAQ 보기</Link>
            </Button>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {CERT_BADGES.map((b) => (
              <span
                key={b}
                className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold"
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
