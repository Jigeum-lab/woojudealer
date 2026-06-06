"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Download, Loader2, ShieldX } from "lucide-react";

import Image from "next/image";

import { useRequireAuth } from "@/lib/auth-context";
import { fetchRequest, statusReached } from "@/lib/db/requests";
import { fetchCertificateByDisplayNo } from "@/lib/db/certificates";
import { fetchCompany } from "@/lib/db/companies";
import {
  Certificate,
  CollectionRequest,
  Company,
  DOD_METHOD,
  ISSUER,
} from "@/lib/types";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

export default function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { authorized } = useRequireAuth();

  const [request, setRequest] = useState<CollectionRequest | null>(null);
  const [cert, setCert] = useState<Certificate | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [qr, setQr] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [ready, setReady] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const req = await fetchRequest(id);
      setRequest(req);
      if (req && statusReached(req.status, "certified")) {
        const result = await fetchCertificateByDisplayNo(id);
        if (result) {
          setCert(result.cert);
          setCompany(await fetchCompany(req.companyId));
          import("qrcode").then((QR) =>
            QR.toDataURL(`https://woojudealer.com/c/${result.cert.qrToken}`, {
              width: 240,
              margin: 1,
              color: { dark: "#1e293b", light: "#ffffff" },
            }).then(setQr)
          );
        }
      }
      setReady(true);
    }
    load();
  }, [id]);

  async function downloadPdf() {
    if (!sheetRef.current || !cert) return;
    setDownloading(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas-pro"),
      ]);
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const imgH = (canvas.height * pageW) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pageW, imgH);
      pdf.save(`certificate_${cert.certNo}.pdf`);
      toast.success("인증서를 다운로드했습니다");
    } catch {
      toast.error("PDF 생성에 실패했습니다. 다시 시도해주세요");
    } finally {
      setDownloading(false);
    }
  }

  if (!authorized || !ready) {
    return (
      <div className="flex flex-1 items-center justify-center py-32 text-text-muted">
        <Loader2 className="mr-2 size-5 animate-spin" /> 불러오는 중…
      </div>
    );
  }

  if (!request || !cert || !company) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center py-32 text-center">
        <ShieldX className="mb-4 size-12 text-border-strong" />
        <p className="mb-1 text-lg font-bold text-foreground">
          아직 발급되지 않은 인증서입니다
        </p>
        <p className="mb-6 text-sm text-text-secondary">
          보안삭제(인증) 단계 완료 후 인증서가 발급됩니다.
        </p>
        <Button asChild variant="outline">
          <Link href="/requests">
            <ArrowLeft className="size-4" /> 신청 현황으로
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 md:px-10 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/requests">
            <ArrowLeft className="size-4" /> 신청 상세로
          </Link>
        </Button>
        <Button variant="cta" onClick={downloadPdf} disabled={downloading}>
          {downloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          PDF 다운로드
        </Button>
      </div>

      {/* A4 Certificate */}
      <div className="flex justify-center">
        <div
          ref={sheetRef}
          className="relative w-[794px] bg-card px-16 py-14 shadow-lg"
          style={{ aspectRatio: "210 / 297" }}
        >
          {/* Border frame */}
          <div className="pointer-events-none absolute inset-5 border-2 border-primary/70" />
          <div className="pointer-events-none absolute inset-[26px] border border-primary/30" />

          <div className="relative flex h-full flex-col">
            {/* Header */}
            <div className="text-center">
              <div className="mb-3 inline-flex items-center gap-2">
                <Image
                  src="/wooju/logo.svg"
                  alt="우주딜러"
                  width={88}
                  height={32}
                  className="h-7 w-auto invert"
                />
              </div>
              <h1 className="text-[34px] font-extrabold tracking-[-0.01em] text-foreground">
                보안삭제 인증서
              </h1>
              <p className="mt-1 text-sm tracking-[0.3em] text-text-muted">
                CERTIFICATE OF SECURE DATA DESTRUCTION
              </p>
              <div className="mx-auto mt-4 inline-block rounded-full bg-brand-green-soft px-4 py-1.5 font-mono text-sm font-bold text-primary">
                {cert.certNo}
              </div>
            </div>

            {/* Body */}
            <div className="mt-9">
              <table className="w-full text-[15px]">
                <tbody>
                  <CertRow label="고객 회사명" value={company.name} />
                  <CertRow label="사업자등록번호" value={company.bizNo} />
                  <CertRow label="담당자" value={company.contact} />
                  <CertRow
                    label="처리 대수"
                    value={`${request.items.quantity}대 (${request.items.manufacturer})`}
                  />
                  <CertRow label="삭제 방식" value={`${DOD_METHOD} (미 국방부 표준)`} />
                  <CertRow label="처리 일자" value={formatDate(cert.issuedAt)} />
                </tbody>
              </table>
            </div>

            {/* Statement */}
            <p className="mt-8 text-center text-[15px] leading-relaxed text-text-secondary">
              위 기기는 <strong className="text-foreground">{DOD_METHOD}</strong>{" "}
              표준에 따라 데이터가 복구 불가능하도록 완전히 삭제되었으며,
              <br />
              본 인증서는 해당 처리가 적법하게 완료되었음을 증명합니다.
            </p>

            {/* Footer */}
            <div className="mt-auto flex items-end justify-between pt-10">
              <div className="flex flex-col items-center gap-1">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt="검증 QR 코드" className="size-24" />
                ) : (
                  <div className="size-24 animate-pulse rounded bg-secondary" />
                )}
                <span className="text-[11px] text-text-muted">스캔하여 진위 확인</span>
              </div>

              <div className="text-right">
                <p className="mb-2 text-sm text-text-secondary">
                  {formatDate(cert.issuedAt)}
                </p>
                <div className="mb-1.5 text-lg font-bold text-foreground">
                  {ISSUER.brand} ({ISSUER.name})
                </div>
                <div className="text-[11px] leading-relaxed text-text-muted">
                  대표 {ISSUER.ceo} · 사업자등록번호 {ISSUER.bizNo}
                  <br />
                  {ISSUER.address}
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <span className="text-xs text-text-muted">대표이사 {ISSUER.ceo}</span>
                  <span className="flex size-12 items-center justify-center rounded-full border-2 border-destructive/70 text-[11px] font-bold text-destructive/70">
                    직인
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CertRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-border">
      <td className="w-[180px] py-3 align-top text-text-secondary">{label}</td>
      <td className="py-3 font-semibold text-foreground">{value}</td>
    </tr>
  );
}
