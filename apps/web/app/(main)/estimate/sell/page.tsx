"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { InquiryForm, type ExtraField } from "@/components/inquiry/inquiry-form";

/**
 * 매입 견적 요청 — 고객이 폐PC를 처분하려고 "얼마나 쳐주나요"를 묻는 화면.
 * 수거 신청(/requests/new)은 이미 맡기기로 정한 사람이 쓰고, 이 화면은
 * 그 앞에서 금액부터 확인하려는 사람이 쓴다.
 */

const EXTRAS: ExtraField[] = [
  {
    id: "specLevel",
    label: "사양을 알고 계신가요?",
    options: [
      { value: "unknown", label: "잘 모릅니다" },
      { value: "rough", label: "대략 압니다" },
      { value: "detailed", label: "모델명까지 압니다" },
    ],
  },
  {
    id: "purchasePeriod",
    label: "구입 시기",
    options: [
      { value: "under3", label: "3년 이내" },
      { value: "3to5", label: "3~5년" },
      { value: "over5", label: "5년 이상" },
      { value: "mixed", label: "섞여 있음" },
    ],
  },
];

export default function SellEstimatePage() {
  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-10 sm:px-6 md:px-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> 홈으로
      </Link>

      <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.18em] text-text-muted">
        매입 견적
      </p>
      <h1 className="mb-4 text-[28px] font-black leading-tight tracking-[-0.02em] text-foreground md:text-[34px]">
        폐PC, 얼마나 받을 수 있는지
        <br />
        먼저 확인해보세요
      </h1>
      <p className="mb-9 max-w-[620px] text-[15px] leading-relaxed text-text-secondary">
        수량만 알려주시면 개략 금액을 회신드립니다. 사양을 모르셔도 됩니다 —
        방문해서 저희가 확인합니다. 가입하지 않아도 접수됩니다.
      </p>

      <InquiryForm
        kind="sell_to_us"
        extras={EXTRAS}
        submitLabel="견적 요청하기"
        doneNote="확인 후 개략 금액을 연락처로 회신드립니다. 금액에 합의하시면 그때 수거 일정을 잡습니다."
        doneCta={{ href: "/requests/new", label: "바로 수거 신청하기" }}
      />
    </div>
  );
}
