"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";

const FAQS = [
  {
    q: "수거 신청 후 얼마나 빨리 픽업되나요?",
    a: "신청 접수 후 영업일 기준 24시간 내에 픽업 기사가 방문합니다. 희망 날짜·시간대를 지정하면 해당 일정에 맞춰 방문합니다.",
  },
  {
    q: "보안삭제는 어떤 방식으로 진행되나요?",
    a: "미 국방부 표준인 DoD 5220.22-M 방식으로 디스크를 3회 이상 덮어써 데이터를 복구 불가능하도록 완전 삭제합니다. 처리 완료 후 법적 효력이 있는 인증서를 발급합니다.",
  },
  {
    q: "최소 신청 수량이 있나요?",
    a: "PC 1대부터 최대 999대까지 신청 가능합니다. 대량(50대 이상) 처리의 경우 별도 일정 조율이 가능합니다.",
  },
  {
    q: "인증서는 어디에 사용할 수 있나요?",
    a: "ESG 보고서, 개인정보보호 감사 대응, 내부 자산 폐기 증빙 등에 활용할 수 있습니다. QR 코드로 진위 여부를 검증할 수 있습니다.",
  },
  {
    q: "비용은 어떻게 되나요?",
    a: "수거·보안삭제·인증서 발급까지 모든 과정이 무료입니다. 회수된 부품의 가치를 통해 운영되며, 일정 조건 충족 시 회수 가치의 일부를 정산해 드립니다.",
  },
  {
    q: "처리 진행 상황을 어떻게 확인하나요?",
    a: "'내 신청' 페이지에서 수거→보안삭제→인증서 발급까지 5단계 처리 현황을 실시간으로 확인할 수 있습니다.",
  },
];

type Tab = "faq" | "terms" | "privacy";

export default function SupportPage() {
  const [tab, setTab] = useState<Tab>("faq");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    if (["faq", "terms", "privacy"].includes(hash)) setTab(hash);
  }, []);

  function onTabChange(v: string) {
    setTab(v as Tab);
    window.history.replaceState(null, "", `#${v}`);
  }

  return (
    <>
      <div className="border-b border-border bg-card py-5">
        <div className="mx-auto max-w-[860px] px-4 sm:px-6 md:px-10">
          <h1 className="text-[22px] font-bold text-foreground">고객 지원</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            자주 묻는 질문과 이용 약관을 확인하세요
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[860px] flex-1 px-10 py-8">
        <Tabs value={tab} onValueChange={onTabChange}>
          <TabsList>
            <TabsTrigger value="faq">자주 묻는 질문</TabsTrigger>
            <TabsTrigger value="terms">이용약관</TabsTrigger>
            <TabsTrigger value="privacy">개인정보처리방침</TabsTrigger>
          </TabsList>

          <TabsContent value="faq">
            <div className="rounded-xl border border-border bg-card px-6">
              <Accordion type="single" collapsible>
                {FAQS.map((f, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger>{f.q}</AccordionTrigger>
                    <AccordionContent>{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-brand-green-soft px-6 py-5">
              <div>
                <div className="text-base font-bold text-foreground">
                  원하는 답변을 찾지 못하셨나요?
                </div>
                <div className="text-sm text-text-secondary">
                  이메일로 문의 주시면 빠르게 답변드리겠습니다.
                </div>
              </div>
              <Button asChild>
                <a href="mailto:contact@woojudealer.com">
                  <Mail className="size-4" /> 문의하기
                </a>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="terms">
            <LegalDoc title="이용약관" sections={TERMS} />
          </TabsContent>

          <TabsContent value="privacy">
            <LegalDoc title="개인정보처리방침" sections={PRIVACY} />
          </TabsContent>
        </Tabs>
      </div>

      <SiteFooter />
    </>
  );
}

function LegalDoc({
  title,
  sections,
}: {
  title: string;
  sections: { h: string; p: string }[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <h2 className="mb-6 text-xl font-bold text-foreground">{title}</h2>
      <div className="flex flex-col gap-6">
        {sections.map((s, i) => (
          <div key={i}>
            <h3 className="mb-2 text-base font-semibold text-foreground">{s.h}</h3>
            <p className="text-sm leading-relaxed text-text-secondary">{s.p}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 border-t border-border pt-4 text-xs text-text-muted">
        본 문서는 데모용 예시이며 실제 법적 효력을 갖지 않습니다.
      </p>
    </div>
  );
}

const TERMS = [
  {
    h: "제1조 (목적)",
    p: "본 약관은 주식회사 우주시스템(이하 '회사')이 제공하는 우주딜러 폐PC 수거·보안삭제 서비스의 이용 조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.",
  },
  {
    h: "제2조 (서비스의 내용)",
    p: "회사는 기업 고객을 대상으로 폐PC 수거, DoD 5220.22-M 표준 보안삭제, 보안삭제 인증서 발급 및 자원 회수 서비스를 제공합니다.",
  },
  {
    h: "제3조 (이용 신청)",
    p: "이용자는 회사가 정한 양식에 회사 정보 및 처리 대상 기기 정보를 정확히 기재하여 수거를 신청해야 합니다.",
  },
  {
    h: "제4조 (책임의 한계)",
    p: "회사는 보안삭제 처리 완료 후 인증서를 발급하며, 인증서에 기재된 처리 내역에 대해 책임을 집니다. 단, 이용자가 사전에 백업하지 않은 데이터에 대해서는 책임지지 않습니다.",
  },
];

const PRIVACY = [
  {
    h: "1. 수집하는 개인정보 항목",
    p: "회사명, 사업자등록번호, 담당자명, 연락처, 주소 등 서비스 제공에 필요한 최소한의 정보를 수집합니다.",
  },
  {
    h: "2. 개인정보의 이용 목적",
    p: "수집한 정보는 수거 신청 처리, 인증서 발급, 고객 지원 및 서비스 개선을 위해 이용됩니다.",
  },
  {
    h: "3. 개인정보의 보유 기간",
    p: "서비스 제공 완료 후 관련 법령이 정한 기간 동안 보관하며, 보관 기간 경과 시 지체 없이 파기합니다.",
  },
  {
    h: "4. 정보주체의 권리",
    p: "이용자는 언제든지 자신의 개인정보를 조회·수정·삭제할 수 있으며, 마이페이지에서 회사 정보를 직접 관리할 수 있습니다.",
  },
];
