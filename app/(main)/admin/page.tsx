"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Loader2, RefreshCw, Search } from "lucide-react";

import { useRequireAuth } from "@/lib/auth-context";
import { fetchAllRequests, setRequestStatus } from "@/lib/db/requests";
import { fetchCompanies } from "@/lib/db/companies";
import {
  CollectionRequest,
  Company,
  RequestStatus,
  STATUS_META,
  STATUS_ORDER,
} from "@/lib/types";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const STATUS_COLORS: Record<string, string> = {
  requested: "#94a3b8",
  pickup: "#f59e0b",
  wiping: "#3b82f6",
  certified: "#22c55e",
  done: "#6366f1",
};

export default function AdminPage() {
  const { authorized } = useRequireAuth("admin");
  const [requests, setRequests] = useState<CollectionRequest[]>([]);
  const [companiesMap, setCompaniesMap] = useState<Record<string, Company>>({});
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RequestStatus>("all");

  const reload = useCallback(async () => {
    const [reqs, cos] = await Promise.all([fetchAllRequests(), fetchCompanies()]);
    setRequests(reqs);
    setCompaniesMap(Object.fromEntries(cos.map((c) => [c.id, c])));
    setReady(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: requests.length,
      active: requests.filter((r) =>
        ["requested", "pickup", "wiping"].includes(r.status)
      ).length,
      done: requests.filter((r) => ["certified", "done"].includes(r.status))
        .length,
      thisMonth: requests.filter((r) => {
        const d = new Date(r.createdAt);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      }).length,
    };
  }, [requests]);

  const byStatus = useMemo(
    () => STATUS_ORDER.map((s) => requests.filter((r) => r.status === s).length),
    [requests]
  );

  const filtered = requests.filter((r) => {
    const company = companiesMap[r.companyId];
    const matchQuery =
      !query ||
      company?.name.toLowerCase().includes(query.toLowerCase()) ||
      r.id.toLowerCase().includes(query.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchQuery && matchStatus;
  });

  async function changeStatus(id: string, status: RequestStatus) {
    try {
      await setRequestStatus(id, status);
      toast.success(`상태가 '${STATUS_META[status].label}'로 변경되었습니다`);
      await reload();
    } catch {
      toast.error("상태 변경에 실패했습니다");
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
          <h1 className="text-[22px] font-bold text-foreground">관리자 대시보드</h1>
          <Button variant="outline" onClick={reload}>
            <RefreshCw className="size-4" /> 새로고침
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 md:px-10 py-8">
        {/* Summary */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <SummaryCard label="전체 신청" value={stats.total} />
          <SummaryCard label="진행 중" value={stats.active} accent="text-info" />
          <SummaryCard label="처리 완료" value={stats.done} accent="text-success" />
          <SummaryCard label="이번 달" value={stats.thisMonth} accent="text-cta" />
        </div>

        {/* Chart */}
        <div className="mb-6 rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-bold text-foreground">
            처리 단계별 현황
          </h2>
          <div className="h-[240px]">
            <Bar
              data={{
                labels: STATUS_ORDER.map((s) => STATUS_META[s].label),
                datasets: [
                  {
                    label: "건수",
                    data: byStatus,
                    backgroundColor: STATUS_ORDER.map((s) => STATUS_COLORS[s]),
                    borderRadius: 6,
                    maxBarThickness: 60,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: "#f1f5f9" } },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="회사명·신청번호 검색"
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as "all" | RequestStatus)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-auto text-sm text-text-muted">
              {filtered.length}건
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-text-muted">
              신청 데이터가 없습니다
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 text-left font-semibold">신청번호</th>
                  <th className="px-4 py-3 text-left font-semibold">회사</th>
                  <th className="px-4 py-3 text-left font-semibold">PC</th>
                  <th className="px-4 py-3 text-left font-semibold">신청일</th>
                  <th className="px-4 py-3 text-left font-semibold">상태</th>
                  <th className="px-4 py-3 text-left font-semibold">상태 변경</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const company = companiesMap[r.companyId];
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border last:border-b-0 hover:bg-secondary/50"
                    >
                      <td className="px-4 py-3 font-mono text-[13px] font-semibold">
                        {r.id}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {company?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {r.items.quantity}대
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_META[r.status].badge as never}>
                          {STATUS_META[r.status].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={r.status}
                          onValueChange={(v) =>
                            changeStatus(r.id, v as RequestStatus)
                          }
                        >
                          <SelectTrigger size="sm" className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_ORDER.map((s) => (
                              <SelectItem key={s} value={s}>
                                {STATUS_META[s].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  accent = "text-foreground",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-1.5 text-sm font-medium text-text-secondary">{label}</div>
      <div className={`text-[28px] font-extrabold leading-none ${accent}`}>
        {value}
      </div>
    </div>
  );
}
