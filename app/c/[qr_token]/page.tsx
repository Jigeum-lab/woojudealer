import { notFound } from "next/navigation";
import { CheckCircle2, Printer, ShieldCheck, XCircle } from "lucide-react";

import { createServiceClient } from "@/lib/supabase/server";
import { ISSUER, DOD_METHOD } from "@/lib/types";

interface PageProps {
  params: Promise<{ qr_token: string }>;
}

interface CertData {
  cert_no: string;
  dod_method: string;
  issued_at: string;
  qr_token: string;
  requests: {
    display_no: string;
    items_quantity: number;
    items_manufacturer: string | null;
    pickup_date: string | null;
    companies: {
      name: string;
      biz_no: string;
    } | null;
  } | null;
}

export default async function QrVerifyPage({ params }: PageProps) {
  const { qr_token } = await params;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("certificates")
    .select(
      `cert_no, dod_method, issued_at, qr_token,
       requests(display_no, items_quantity, items_manufacturer, pickup_date,
         companies(name, biz_no))`
    )
    .eq("qr_token", qr_token)
    .maybeSingle();

  if (error || !data) notFound();

  const cert = data as unknown as CertData;
  const req = cert.requests;
  const company = req?.companies;

  const issuedDate = new Date(cert.issued_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {/* Print button — hidden in print */}
      <div className="print:hidden fixed right-6 top-6 z-50">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg hover:brightness-110"
        >
          <Printer className="size-4" />
          PDF 저장 / 인쇄
        </button>
      </div>

      {/* Verification banner — hidden in print */}
      <div className="print:hidden bg-primary/10 border-b border-primary/20 px-6 py-3 text-center">
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
          <CheckCircle2 className="size-4" />
          QR 코드로 검증된 공식 보안삭제 인증서입니다
        </div>
      </div>

      {/* Certificate — visible both on screen and in print */}
      <main className="min-h-screen bg-white px-8 py-12 print:px-0 print:py-0">
        <div className="mx-auto max-w-[800px]">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between border-b-2 border-black pb-6">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <ShieldCheck className="size-6 text-green-600" />
                <span className="text-lg font-bold text-green-600">{ISSUER.brand}</span>
              </div>
              <h1 className="text-3xl font-black text-black">보안삭제 인증서</h1>
              <p className="mt-1 text-sm text-gray-500">Certificate of Secure Data Destruction</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <div className="font-bold text-base text-black">{cert.cert_no}</div>
              <div>발급일: {issuedDate}</div>
            </div>
          </div>

          {/* Issuer info */}
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
              발급 기관
            </h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
              <Row label="상호" value={ISSUER.name} />
              <Row label="대표자" value={ISSUER.ceo} />
              <Row label="사업자번호" value={ISSUER.bizNo} />
              <Row label="법인등록번호" value={ISSUER.corpNo} />
              <Row label="주소" value={ISSUER.address} className="col-span-2" />
            </div>
          </section>

          {/* Customer info */}
          {company && (
            <section className="mb-6">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
                고객사
              </h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
                <Row label="회사명" value={company.name} />
                <Row label="사업자번호" value={company.biz_no} />
              </div>
            </section>
          )}

          {/* Destruction details */}
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
              보안삭제 내역
            </h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
              <Row label="신청번호" value={req?.display_no ?? "-"} />
              <Row label="수거 대수" value={`${req?.items_quantity ?? 0}대`} />
              <Row label="제조사" value={req?.items_manufacturer ?? "-"} />
              <Row
                label="수거일"
                value={
                  req?.pickup_date
                    ? new Date(req.pickup_date).toLocaleDateString("ko-KR")
                    : "-"
                }
              />
              <Row label="삭제 방식" value={cert.dod_method} className="col-span-2" />
            </div>
          </section>

          {/* DoD description */}
          <section className="mb-8 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="size-5 mt-0.5 shrink-0 text-green-600" />
              <div>
                <div className="font-bold text-green-800">{DOD_METHOD}</div>
                <p className="mt-1 text-sm text-green-700">
                  미국 국방부(DoD) 5220.22-M 표준에 따른 3-패스(7-패스 옵션) 덮어쓰기 방식으로
                  데이터를 완전 삭제하였습니다. 삭제된 데이터는 복구 불가능합니다.
                </p>
              </div>
            </div>
          </section>

          {/* QR verification notice */}
          <div className="mb-8 flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm text-gray-600">
            <CheckCircle2 className="size-5 shrink-0 text-green-600" />
            <span>
              이 인증서는 QR 코드 검증을 통해 진위가 확인되었습니다. 위조·변조 시 법적 책임을 집니다.
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-end justify-between border-t-2 border-black pt-6">
            <div className="text-sm text-gray-600">
              <div className="font-bold text-base text-black">{issuedDate}</div>
              <div className="mt-1">{ISSUER.name}</div>
              <div>대표 {ISSUER.ceo} (인)</div>
            </div>
            <div className="text-right text-xs text-gray-400">
              <div>{ISSUER.address}</div>
              <div>관할: {ISSUER.taxOffice}</div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function Row({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="text-gray-500">{label}: </span>
      <span className="font-medium text-black">{value}</span>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { qr_token } = await params;
  return {
    title: `보안삭제 인증서 검증 — 우주딜러`,
    description: `QR 토큰 ${qr_token.slice(0, 8)}... 인증서 진위 확인`,
  };
}
