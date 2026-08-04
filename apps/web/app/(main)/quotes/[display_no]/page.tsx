"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Printer } from "lucide-react";

import { useRequireAuth } from "@/lib/auth-context";
import { fetchQuoteByDisplayNo } from "@/lib/db/quotes";
import { fetchCompany } from "@/lib/db/companies";
import {
  CATEGORY_META,
  ISSUER,
  QUOTE_TERMS,
  type Company,
  type Quote,
} from "@/lib/types";
import { totalsFromItems } from "@/lib/quote/totals";
import { formatDate, formatWon } from "@/lib/format";

type DocKind = "quote" | "invoice";

const DOC_META: Record<DocKind, { title: string; noLabel: string; dateLabel: string; amountLabel: string }> = {
  quote:   { title: "견 적 서",       noLabel: "견적번호", dateLabel: "견적일자", amountLabel: "견적금액" },
  invoice: { title: "거 래 명 세 서", noLabel: "거래번호", dateLabel: "거래일자", amountLabel: "거래금액" },
};

export default function QuoteDocumentPage({
  params,
}: {
  params: Promise<{ display_no: string }>;
}) {
  const { display_no } = use(params);
  const { authorized } = useRequireAuth("admin");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [customer, setCustomer] = useState<Company | null>(null);
  const [kind, setKind] = useState<DocKind>("quote");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchQuoteByDisplayNo(decodeURIComponent(display_no))
      .then(async (q) => {
        if (!alive) return;
        setQuote(q);
        if (q?.companyId) {
          setCustomer(await fetchCompany(q.companyId).catch(() => null));
        }
      })
      .catch(() => toast.error("견적서를 불러오지 못했습니다"))
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [display_no]);

  if (!authorized) return null;

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted">
        <Loader2 className="mr-2 size-5 animate-spin" />
        불러오는 중…
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-text-secondary">견적서를 찾을 수 없습니다.</p>
        <Link href="/quotes" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
          견적 목록으로
        </Link>
      </div>
    );
  }

  const meta = DOC_META[kind];
  const totals = totalsFromItems(quote.items, quote.vatIncluded);
  const vatNote = quote.vatIncluded ? "(VAT포함)" : "(VAT별도)";

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-8">
      {/* 화면 전용 툴바 — 인쇄 시 숨김 */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/quotes"
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          견적 목록
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-border bg-secondary p-1">
            {(Object.keys(DOC_META) as DocKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-md px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                  kind === k
                    ? "bg-primary text-primary-foreground"
                    : "text-text-secondary hover:text-foreground"
                }`}
              >
                {k === "quote" ? "견적서" : "거래명세서"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110"
          >
            <Printer className="size-4" />
            PDF 저장 / 인쇄
          </button>
        </div>
      </div>

      {/* 문서 본문 — 인쇄 대상 */}
      <article className="rounded-xl border border-border bg-white p-8 text-black print:rounded-none print:border-0 print:p-0">
        <h1 className="mb-8 text-center text-3xl font-bold tracking-[0.3em]">
          {meta.title}
        </h1>

        <div className="mb-6 grid gap-6 sm:grid-cols-2">
          {/* 좌: 문서 정보 */}
          <dl className="flex flex-col gap-1 text-[13px]">
            <Row label={meta.noLabel} value={quote.displayNo} />
            <Row label="주문자" value={quote.customerName} />
            <Row label={meta.dateLabel} value={formatDate(quote.quoteDate)} />
            <Row
              label={meta.amountLabel}
              value={`${formatWon(totals.grand)} ${vatNote}`}
              strong
            />
            {kind === "quote" && (
              <>
                <Row label="견적유효" value={QUOTE_TERMS.validity} />
                <Row label="납기조건" value={QUOTE_TERMS.delivery} />
              </>
            )}
            <Row label="A/S" value={QUOTE_TERMS.warranty} />
          </dl>

          {/* 우: 공급자 */}
          <div className="rounded-md border border-gray-300 p-4">
            <p className="mb-2 text-center text-[13px] font-bold tracking-[0.2em]">
              공 급 자
            </p>
            <dl className="flex flex-col gap-1 text-[13px]">
              <Row label="사업자번호" value={ISSUER.bizNo} />
              <Row label="상호" value={ISSUER.name} />
              <Row label="대표" value={ISSUER.ceo} />
              <Row label="담당자" value={`${ISSUER.ceo} 010-2635-0153`} />
              <Row label="주소" value={ISSUER.address} />
              <Row label="Tel" value="010-2635-0153" />
            </dl>
          </div>
        </div>

        {customer && (
          <div className="mb-6 rounded-md border border-gray-300 p-4">
            <p className="mb-2 text-[13px] font-bold">공급받는 자</p>
            <dl className="grid gap-1 text-[13px] sm:grid-cols-2">
              <Row label="회사명" value={customer.name} />
              <Row label="사업자번호" value={customer.bizNo} />
              {customer.contact && <Row label="담당자" value={customer.contact} />}
              {customer.phone && <Row label="연락처" value={customer.phone} />}
            </dl>
          </div>
        )}

        {kind === "invoice" && (
          <p className="mb-3 text-[13px]">아래와 같이 거래 합니다.</p>
        )}

        {/* 품목 표 */}
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y-2 border-gray-800 bg-gray-50">
              <th className="w-12 px-2 py-2 text-center font-bold">번호</th>
              <th className="w-28 px-2 py-2 text-left font-bold">분류</th>
              <th className="px-2 py-2 text-left font-bold">제품명</th>
              <th className="w-14 px-2 py-2 text-center font-bold">수량</th>
              <th className="w-28 px-2 py-2 text-right font-bold">금액</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, i) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="px-2 py-1.5 text-center">{i + 1}</td>
                <td className="px-2 py-1.5">{CATEGORY_META[item.category].label}</td>
                <td className="px-2 py-1.5">{item.name}</td>
                <td className="px-2 py-1.5 text-center">{item.quantity}</td>
                <td className="px-2 py-1.5 text-right">
                  {formatWon(item.unitPrice * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {totals.service + totals.peripheral > 0 && (
              <tr className="border-b border-gray-200 text-gray-600">
                <td colSpan={4} className="px-2 py-1.5 text-right">
                  본체 견적합계
                </td>
                <td className="px-2 py-1.5 text-right">{formatWon(totals.core)}</td>
              </tr>
            )}
            <tr className="border-y-2 border-gray-800">
              <td colSpan={4} className="px-2 py-2.5 text-right font-bold">
                총 {kind === "quote" ? "견적" : "거래"}금액 {vatNote}
              </td>
              <td className="px-2 py-2.5 text-right text-base font-extrabold">
                {formatWon(totals.grand)}
              </td>
            </tr>
          </tfoot>
        </table>

        {quote.note && (
          <p className="mt-4 whitespace-pre-wrap text-[13px] text-gray-700">
            {quote.note}
          </p>
        )}
      </article>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-gray-500">{label}</dt>
      <dd className={strong ? "font-bold" : ""}>{value}</dd>
    </div>
  );
}
