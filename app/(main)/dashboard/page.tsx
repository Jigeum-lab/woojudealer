"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bar,
  Doughnut,
} from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Cpu, Download, Leaf, Loader2, Coins, BarChart3 } from "lucide-react";

import { useRequireAuth } from "@/lib/auth-context";
import { fetchAllRequests } from "@/lib/db/requests";
import {
  CARBON_PER_PC,
  CollectionRequest,
  STATUS_META,
  STATUS_ORDER,
  VALUE_PER_PC,
} from "@/lib/types";
import { formatKRW, formatNumber, formatWeight } from "@/lib/format";
import { Button } from "@/components/ui/button";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const STATUS_COLORS: Record<string, string> = {
  requested: "#94a3b8",
  pickup: "#f59e0b",
  wiping: "#3b82f6",
  certified: "#22c55e",
  done: "#6366f1",
};

export default function DashboardPage() {
  const { authorized, user } = useRequireAuth();
  const [requests, setRequests] = useState<CollectionRequest[]>([]);
  const [ready, setReady] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const reqs = await fetchAllRequests();
      setRequests(reqs);
      setReady(true);
    }
    load();
  }, [user]);

  const processed = useMemo(
    () => requests.filter((r) => ["certified", "done"].includes(r.status)),
    [requests]
  );
  const totalPc = processed.reduce((s, r) => s + r.items.quantity, 0);
  const carbon = totalPc * CARBON_PER_PC;
  const value = totalPc * VALUE_PER_PC;

  const monthly = useMemo(() => buildMonthly(requests), [requests]);
  const distribution = useMemo(() => {
    return STATUS_ORDER.map(
      (s) => requests.filter((r) => r.status === s).length
    );
  }, [requests]);

  async function downloadReport() {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas-pro"),
      ]);
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#f8fafc",
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save("esg-report.pdf");
      toast.success("ESG 리포트를 다운로드했습니다");
    } catch {
      toast.error("리포트 생성에 실패했습니다");
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

  return (
    <>
      <div className="border-b border-border bg-card py-5">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-10">
          <div>
            <h1 className="text-[22px] font-bold text-foreground">ESG 대시보드</h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              누적 처리 실적과 환경 기여 지표를 확인하세요
            </p>
          </div>
          <Button variant="outline" onClick={downloadReport} disabled={downloading}>
            {downloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            리포트 PDF
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 md:px-10 py-8">
        {processed.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-card py-20 text-center">
            <BarChart3 className="mb-4 size-12 text-border-strong" />
            <p className="mb-1 text-base font-semibold text-foreground">
              처리 데이터가 아직 없습니다
            </p>
            <p className="mb-5 text-sm text-text-secondary">
              처리 데이터는 수거 완료 후 자동 반영됩니다
            </p>
            <Button asChild variant="cta">
              <Link href="/requests/new">수거 신청하기</Link>
            </Button>
          </div>
        ) : (
          <div ref={reportRef} className="flex flex-col gap-6">
            {/* KPI */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard
                icon={Cpu}
                iconClass="bg-brand-green-soft text-primary"
                label="총 처리 대수"
                value={`${formatNumber(totalPc)}대`}
                sub={`${processed.length}건 처리 완료`}
              />
              <KpiCard
                icon={Leaf}
                iconClass="bg-brand-green-soft text-success"
                label="탄소 절감"
                value={formatWeight(carbon)}
                sub={`대당 ${CARBON_PER_PC}kgCO₂ 절감 기준`}
              />
              <KpiCard
                icon={Coins}
                iconClass="bg-brand-green-soft text-cta"
                label="회수 가치"
                value={formatKRW(value)}
                sub={`대당 ${formatKRW(VALUE_PER_PC)} 기준`}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-[1.6fr_1fr] gap-4">
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-4 text-base font-bold text-foreground">
                  월별 처리 트렌드
                </h2>
                <div className="h-[280px]">
                  <Bar
                    data={{
                      labels: monthly.map((m) => m.label),
                      datasets: [
                        {
                          label: "처리 대수",
                          data: monthly.map((m) => m.qty),
                          backgroundColor: "#2563eb",
                          borderRadius: 6,
                          maxBarThickness: 44,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { beginAtZero: true, grid: { color: "#f1f5f9" } },
                        x: { grid: { display: false } },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-4 text-base font-bold text-foreground">
                  처리 단계별 분포
                </h2>
                <div className="flex h-[280px] items-center justify-center">
                  <Doughnut
                    data={{
                      labels: STATUS_ORDER.map((s) => STATUS_META[s].label),
                      datasets: [
                        {
                          data: distribution,
                          backgroundColor: STATUS_ORDER.map(
                            (s) => STATUS_COLORS[s]
                          ),
                          borderWidth: 2,
                          borderColor: "#ffffff",
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: "62%",
                      plugins: {
                        legend: {
                          position: "bottom",
                          labels: { boxWidth: 12, padding: 12, font: { size: 12 } },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function KpiCard({
  icon: Icon,
  iconClass,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <span
          className={`flex size-9 items-center justify-center rounded-lg ${iconClass}`}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <div className="text-[32px] font-extrabold leading-none text-foreground">
        {value}
      </div>
      <div className="mt-2 text-[13px] text-text-muted">{sub}</div>
    </div>
  );
}

function buildMonthly(requests: CollectionRequest[]) {
  const now = new Date();
  const months: { key: string; label: string; qty: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: `${d.getMonth() + 1}월`,
      qty: 0,
    });
  }
  requests.forEach((r) => {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find((x) => x.key === key);
    if (m) m.qty += r.items.quantity;
  });
  return months;
}
