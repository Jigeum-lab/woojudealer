"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { InquiryForm, type ExtraField } from "@/components/inquiry/inquiry-form";

/**
 * 판매 견적 요청 — 고객이 재생 PC를 사려고 문의하는 화면.
 * 접수되면 관리자가 /quotes/new에서 부품으로 사양을 구성해 견적서를 발행한다.
 */

const EXTRAS: ExtraField[] = [
  {
    id: "purpose",
    label: "어디에 쓰시나요?",
    options: [
      { value: "office", label: "사무용" },
      { value: "pcbang", label: "PC방" },
      { value: "dev", label: "개발·설계용" },
      { value: "edu", label: "교육·공공" },
      { value: "etc", label: "기타" },
    ],
  },
  {
    id: "budgetPerUnit",
    label: "대당 예산",
    placeholder: "500000",
    suffix: "원",
  },
];

export default function BuyEstimatePage() {
  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-10 sm:px-6 md:px-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> 홈으로
      </Link>

      <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.18em] text-text-muted">
        판매 견적
      </p>
      <h1 className="mb-4 text-[28px] font-black leading-tight tracking-[-0.02em] text-foreground md:text-[34px]">
        되살린 PC를
        <br />
        예산에 맞춰 구성해드립니다
      </h1>
      <p className="mb-9 max-w-[620px] text-[15px] leading-relaxed text-text-secondary">
        용도와 예산을 알려주시면 부품 재고에서 사양을 구성해 견적서를
        보내드립니다. 조립되지 않는 구성은 발행 단계에서 걸러집니다.
      </p>

      <InquiryForm
        kind="buy_from_us"
        extras={EXTRAS}
        submitLabel="견적 요청하기"
        doneNote="용도와 예산에 맞춰 사양을 구성한 뒤 견적서를 보내드립니다."
      />
    </div>
  );
}
