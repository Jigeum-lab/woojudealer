"use client";

import { useEffect, useState } from "react";
import { Coins, Loader2, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";

import { useAuth, useRequireAuth } from "@/lib/auth-context";
import { fetchSettlementsByCompany, fetchAllSettlements, updateSettlementStatus } from "@/lib/db/settlements";
import type { Settlement, SettlementStatus } from "@/lib/types";
import { SETTLEMENT_META } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettlementsPage() {
  const { user } = useRequireAuth();
  const { company } = useAuth();
  const isAdmin = user?.role === "admin";
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [ready, setReady] = useState(false);

  async function load() {
    if (!user) return;
    try {
      const data = isAdmin
        ? await fetchAllSettlements()
        : await fetchSettlementsByCompany(company?.id ?? null);
      setSettlements(data);
    } catch {
      // DB 오류 시에도 ready 처리
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    if (user) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const totalAmount = settlements.reduce((s, r) => s + r.amount, 0);
  const paidAmount = settlements.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0);
  const pendingCount = settlements.filter((r) => r.status === "pending").length;

  async function handleStatusChange(id: string, status: SettlementStatus) {
    try {
      await updateSettlementStatus(id, status);
      toast.success("정산 상태가 변경되었습니다");
      await load();
    } catch {
      toast.error("상태 변경에 실패했습니다");
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-5 sm:px-6 md:px-10">
          <div>
            <h1 className="text-[22px] font-bold text-foreground">정산 내역</h1>
            <p className="text-sm text-text-secondary">
              처리 완료된 수거 건의 수익 공유 내역
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 md:px-10">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={Wallet}
            label="총 정산 예정"
            value={`${totalAmount.toLocaleString()}원`}
            accent="text-primary"
          />
          <StatCard
            icon={TrendingUp}
            label="정산 완료"
            value={`${paidAmount.toLocaleString()}원`}
            accent="text-blue-400"
          />
          <StatCard
            icon={Coins}
            label="처리 대기"
            value={`${pendingCount}건`}
            accent="text-yellow-400"
          />
        </div>

        {/* Table */}
        {settlements.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
            <Wallet className="mb-3 size-10 text-text-muted" />
            <p className="text-base font-semibold text-foreground">정산 내역이 없습니다</p>
            <p className="mt-1 text-sm text-text-secondary">
              수거 처리가 완료되면 자동으로 정산이 생성됩니다
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary">신청번호</th>
                    {isAdmin && (
                      <th className="px-4 py-3 text-left font-semibold text-text-secondary">회사</th>
                    )}
                    <th className="px-4 py-3 text-right font-semibold text-text-secondary">금액</th>
                    <th className="px-4 py-3 text-center font-semibold text-text-secondary">상태</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary">생성일</th>
                    {isAdmin && (
                      <th className="px-4 py-3 text-center font-semibold text-text-secondary">처리</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                        {s.requestId.slice(0, 8).toUpperCase()}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-text-secondary">
                          {s.companyId.slice(0, 8)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-bold text-primary">
                        {s.amount.toLocaleString()}원
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {new Date(s.createdAt).toLocaleDateString("ko-KR")}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-center">
                          <Select
                            value={s.status}
                            onValueChange={(v) =>
                              handleStatusChange(s.id, v as SettlementStatus)
                            }
                          >
                            <SelectTrigger className="h-7 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">대기</SelectItem>
                              <SelectItem value="processing">처리 중</SelectItem>
                              <SelectItem value="paid">완료</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex size-10 items-center justify-center rounded-lg bg-brand-green-soft">
        <Icon className={`size-5 ${accent}`} />
      </div>
      <div>
        <div className="text-xs text-text-muted">{label}</div>
        <div className={`text-xl font-bold ${accent}`}>{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SettlementStatus }) {
  const meta = SETTLEMENT_META[status];
  const bg =
    status === "paid"
      ? "bg-primary/10 text-primary"
      : status === "processing"
      ? "bg-blue-400/10 text-blue-400"
      : "bg-yellow-400/10 text-yellow-400";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${bg}`}>
      {meta.label}
    </span>
  );
}
