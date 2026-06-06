"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  FileText,
  Inbox,
  Loader2,
  Plus,
  ArrowRight,
} from "lucide-react";

import { useAuth, useRequireAuth } from "@/lib/auth-context";
import { fetchAllRequests, advanceRequest, statusReached } from "@/lib/db/requests";
import { fetchCompanies } from "@/lib/db/companies";
import {
  CollectionRequest,
  Company,
  STATUS_META,
  STATUS_ORDER,
} from "@/lib/types";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "done";

function RequestsInner() {
  const { authorized, user } = useRequireAuth();
  const { company } = useAuth();
  const params = useSearchParams();
  const focusId = params.get("focus");

  const [requests, setRequests] = useState<CollectionRequest[]>([]);
  const [companiesMap, setCompaniesMap] = useState<Record<string, Company>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(focusId);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    const [reqs, cos] = await Promise.all([fetchAllRequests(), fetchCompanies()]);
    setRequests(reqs);
    setCompaniesMap(Object.fromEntries(cos.map((c) => [c.id, c])));
    setReady(true);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!authorized || !user) {
    return (
      <div className="flex flex-1 items-center justify-center py-32 text-text-muted">
        <Loader2 className="mr-2 size-5 animate-spin" /> 불러오는 중…
      </div>
    );
  }

  const filtered = requests.filter((r) => {
    if (filter === "active")
      return ["requested", "pickup", "wiping"].includes(r.status);
    if (filter === "done") return ["certified", "done"].includes(r.status);
    return true;
  });

  return (
    <>
      <div className="border-b border-border bg-card py-5">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-10">
          <h1 className="text-[22px] font-bold text-foreground">
            {user.role === "admin" ? "전체 신청 현황" : "내 신청"}
          </h1>
          <Button asChild variant="cta">
            <Link href="/requests/new">
              <Plus className="size-4" /> 새 신청
            </Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1280px] px-10 py-8">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as Filter)}
          className="mb-6"
        >
          <TabsList>
            <TabsTrigger value="all">전체 ({requests.length})</TabsTrigger>
            <TabsTrigger value="active">
              진행 중 (
              {
                requests.filter((r) =>
                  ["requested", "pickup", "wiping"].includes(r.status)
                ).length
              }
              )
            </TabsTrigger>
            <TabsTrigger value="done">
              완료 (
              {
                requests.filter((r) =>
                  ["certified", "done"].includes(r.status)
                ).length
              }
              )
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {!ready ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-border bg-card"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                showCompany={user.role === "admin"}
                companiesMap={companiesMap}
                expanded={expanded === r.id}
                onToggle={() =>
                  setExpanded((cur) => (cur === r.id ? null : r.id))
                }
                onAdvanced={reload}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-card py-20 text-center">
      <Inbox className="mb-4 size-12 text-border-strong" />
      <p className="mb-1 text-base font-semibold text-foreground">
        아직 신청이 없어요
      </p>
      <p className="mb-5 text-sm text-text-secondary">
        첫 신청을 시작해보세요
      </p>
      <Button asChild variant="cta">
        <Link href="/requests/new">
          <Plus className="size-4" /> 수거 신청하기
        </Link>
      </Button>
    </div>
  );
}

function RequestCard({
  request,
  showCompany,
  companiesMap,
  expanded,
  onToggle,
  onAdvanced,
}: {
  request: CollectionRequest;
  showCompany: boolean;
  companiesMap: Record<string, Company>;
  expanded: boolean;
  onToggle: () => void;
  onAdvanced: () => void;
}) {
  const router = useRouter();
  const [advancing, setAdvancing] = useState(false);
  const meta = STATUS_META[request.status];
  const company = companiesMap[request.companyId];
  const canCertificate = statusReached(request.status, "certified");
  const isDone = request.status === "done";

  async function handleAdvance() {
    setAdvancing(true);
    try {
      const updated = await advanceRequest(request.id);
      if (updated)
        toast.success(`상태가 '${STATUS_META[updated.status].label}'로 변경되었습니다`);
      onAdvanced();
    } catch {
      toast.error("상태 변경에 실패했습니다");
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-5 px-6 py-4 text-left outline-none focus-visible:bg-secondary"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm font-bold text-foreground">
              {request.id}
            </span>
            <Badge variant={meta.badge as never}>{meta.label}</Badge>
          </div>
          <div className="mt-1 text-[13px] text-text-secondary">
            {showCompany && company ? `${company.name} · ` : ""}
            PC {request.items.quantity}대 · {request.items.manufacturer} ·
            신청일 {formatDate(request.createdAt)}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "size-5 text-text-muted transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-border bg-secondary/40 px-6 py-6">
          <ProcessStepper current={request.status} />

          <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2.5 rounded-lg border border-border bg-card p-5 text-sm">
            <Info label="PC 수량" value={`${request.items.quantity}대`} />
            <Info label="제조사" value={request.items.manufacturer} />
            <Info label="연식" value={request.items.age} />
            <Info label="OS" value={request.items.os} />
            <Info label="픽업 희망일" value={request.pickup.date} />
            <Info label="시간대" value={request.pickup.timeSlot} />
            {request.pickup.address && (
              <Info label="픽업 주소" value={request.pickup.address} full />
            )}
            {request.items.note && (
              <Info label="비고" value={request.items.note} full />
            )}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              disabled={!canCertificate}
              title={canCertificate ? undefined : "보안삭제 완료 후 발급됩니다"}
              onClick={() =>
                router.push(`/requests/${request.id}/certificate`)
              }
            >
              <FileText className="size-4" /> 인증서 보기
            </Button>
            <Button onClick={handleAdvance} disabled={advancing || isDone}>
              {advancing && <Loader2 className="size-4 animate-spin" />}
              {isDone ? "처리 완료됨" : "다음 단계로"}
              {!isDone && !advancing && <ArrowRight className="size-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={cn("flex justify-between gap-4", full && "col-span-2")}>
      <span className="text-text-secondary">{label}</span>
      <span className="text-right font-semibold text-foreground">{value}</span>
    </div>
  );
}

function ProcessStepper({ current }: { current: CollectionRequest["status"] }) {
  const currentIdx = STATUS_ORDER.indexOf(current);
  return (
    <div className="flex items-start">
      {STATUS_ORDER.map((s, i) => {
        const state =
          i < currentIdx ? "done" : i === currentIdx ? "active" : "pending";
        return (
          <div key={s} className="flex flex-1 items-start last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-xs font-bold",
                  state === "active" &&
                    "bg-primary text-white ring-4 ring-primary/15",
                  state === "done" && "bg-success text-white",
                  state === "pending" &&
                    "border-2 border-border bg-card text-text-muted"
                )}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  "mt-1.5 whitespace-nowrap text-xs font-semibold",
                  state === "active" && "text-primary",
                  state === "done" && "text-success",
                  state === "pending" && "text-text-muted"
                )}
              >
                {STATUS_META[s].label}
              </span>
            </div>
            {i < STATUS_ORDER.length - 1 && (
              <span
                className={cn(
                  "mx-1 mt-4 h-0.5 flex-1",
                  i < currentIdx ? "bg-success" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function RequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-32 text-text-muted">
          <Loader2 className="mr-2 size-5 animate-spin" /> 불러오는 중…
        </div>
      }
    >
      <RequestsInner />
    </Suspense>
  );
}
