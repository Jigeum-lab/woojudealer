"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Inbox, Loader2, Phone } from "lucide-react";

import { useRequireAuth } from "@/lib/auth-context";
import { fetchInquiries, setInquiryStatus } from "@/lib/db/inquiries";
import {
  CATEGORY_META,
  INQUIRY_KIND_META,
  INQUIRY_STATUS_META,
  type Inquiry,
  type InquiryKind,
  type InquiryStatus,
} from "@/lib/types";
import { formatDateTime, formatWon } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** 견적 요청 문의함 — 접수된 리드를 관리자가 처리하는 화면 */

const SPEC_LABEL: Record<string, string> = {
  unknown: "사양 모름",
  rough: "대략 앎",
  detailed: "모델명까지 앎",
};

const PERIOD_LABEL: Record<string, string> = {
  under3: "3년 이내",
  "3to5": "3~5년",
  over5: "5년 이상",
  mixed: "섞여 있음",
};

const PURPOSE_LABEL: Record<string, string> = {
  office: "사무용",
  pcbang: "PC방",
  dev: "개발·설계용",
  edu: "교육·공공",
  etc: "기타",
};

type Filter = "all" | InquiryKind;

export default function AdminInquiriesPage() {
  const { authorized } = useRequireAuth("admin");
  const [items, setItems] = useState<Inquiry[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [ready, setReady] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setItems(await fetchInquiries());
    } catch {
      toast.error("견적 요청을 불러오지 못했습니다");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(
    () => items.filter((i) => filter === "all" || i.kind === filter),
    [items, filter]
  );

  const newCount = items.filter((i) => i.status === "new").length;

  async function changeStatus(id: string, status: InquiryStatus) {
    setSavingId(id);
    try {
      const updated = await setInquiryStatus(id, status);
      setItems((list) => list.map((i) => (i.id === id ? updated : i)));
      toast.success(`'${INQUIRY_STATUS_META[status].label}'로 변경했습니다`);
    } catch {
      toast.error("상태 변경에 실패했습니다");
    } finally {
      setSavingId(null);
    }
  }

  if (!authorized) {
    return (
      <div className="flex flex-1 items-center justify-center py-32 text-text-muted">
        <Loader2 className="mr-2 size-5 animate-spin" /> 불러오는 중…
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-border bg-card py-5">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 sm:px-6 md:px-10">
          <div>
            <h1 className="text-[22px] font-bold text-foreground">견적 요청</h1>
            <p className="mt-0.5 text-[13px] text-text-secondary">
              {newCount > 0
                ? `연락 대기 ${newCount}건`
                : "새로 접수된 요청이 없습니다"}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 md:px-10">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as Filter)}
          className="mb-6"
        >
          <TabsList>
            <TabsTrigger value="all">전체 ({items.length})</TabsTrigger>
            <TabsTrigger value="sell_to_us">
              매입 ({items.filter((i) => i.kind === "sell_to_us").length})
            </TabsTrigger>
            <TabsTrigger value="buy_from_us">
              판매 ({items.filter((i) => i.kind === "buy_from_us").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {!ready ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-border bg-card"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-card py-20 text-center">
            <Inbox className="mb-4 size-12 text-border-strong" />
            <p className="text-base font-semibold text-foreground">
              접수된 견적 요청이 없습니다
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((q) => (
              <article
                key={q.id}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="font-mono text-[13px] font-bold text-foreground">
                    {q.displayNo}
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[11.5px] font-semibold text-text-secondary">
                    {INQUIRY_KIND_META[q.kind].short}
                  </span>
                  <span
                    className={`text-[12px] font-semibold ${INQUIRY_STATUS_META[q.status].color}`}
                  >
                    {INQUIRY_STATUS_META[q.status].label}
                  </span>
                  <span className="ml-auto font-mono text-[12px] text-text-muted">
                    {formatDateTime(q.createdAt)}
                  </span>
                </div>

                <div className="mb-4 grid gap-x-8 gap-y-2.5 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
                  <Row label="담당자">
                    {q.contactName}
                    {q.companyName ? ` · ${q.companyName}` : ""}
                  </Row>
                  <Row label="연락처">
                    <a
                      href={`tel:${q.contactPhone.replace(/[^0-9+]/g, "")}`}
                      className="inline-flex items-center gap-1.5 font-mono text-primary hover:underline"
                    >
                      <Phone className="size-3.5" />
                      {q.contactPhone}
                    </a>
                  </Row>
                  {q.contactEmail && <Row label="이메일">{q.contactEmail}</Row>}
                  <Row label="수량">{q.quantity}대</Row>

                  {q.kind === "sell_to_us" ? (
                    <>
                      {q.specLevel && (
                        <Row label="사양 파악">
                          {SPEC_LABEL[q.specLevel] ?? q.specLevel}
                        </Row>
                      )}
                      {q.purchasePeriod && (
                        <Row label="구입 시기">
                          {PERIOD_LABEL[q.purchasePeriod] ?? q.purchasePeriod}
                        </Row>
                      )}
                    </>
                  ) : (
                    <>
                      {q.purpose && (
                        <Row label="용도">
                          {PURPOSE_LABEL[q.purpose] ?? q.purpose}
                        </Row>
                      )}
                      {q.budgetPerUnit !== undefined && (
                        <Row label="대당 예산">{formatWon(q.budgetPerUnit)}</Row>
                      )}
                    </>
                  )}
                </div>

                {/* 구성기로 담아 보낸 사양 — 그대로 견적서로 옮기면 된다 */}
                {q.build && q.build.items.length > 0 && (
                  <div className="mb-4 overflow-hidden rounded-lg border border-border bg-background">
                    <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                      <span className="text-[12px] font-bold text-text-secondary">
                        고객이 담은 구성 · {q.build.platform === "intel" ? "Intel" : "AMD"}
                      </span>
                      <span className="font-mono text-[12px] text-text-muted">
                        {q.build.items.length}개 품목
                      </span>
                    </div>
                    <ul className="divide-y divide-border/60">
                      {q.build.items.map((it, i) => (
                        <li
                          key={`${it.partNo ?? it.name}-${i}`}
                          className="flex items-center gap-3 px-4 py-2 text-[12.5px]"
                        >
                          <span className="w-[84px] shrink-0 text-text-muted">
                            {CATEGORY_META[it.category].label}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-foreground">
                            {it.name}
                          </span>
                          {it.qty > 1 && (
                            <span className="shrink-0 text-text-muted">×{it.qty}</span>
                          )}
                          <span className="shrink-0 font-mono text-text-secondary">
                            {formatWon(it.price * it.qty)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
                      <span className="text-[12.5px] font-bold text-foreground">합계</span>
                      <span className="font-mono text-[14px] font-bold text-primary">
                        {formatWon(q.build.total)}
                      </span>
                    </div>
                  </div>
                )}

                {q.note && (
                  <p className="mb-4 rounded-lg border border-border bg-background px-4 py-3 text-[13px] leading-relaxed text-text-secondary">
                    {q.note}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2.5 border-t border-border pt-4">
                  {savingId === q.id && (
                    <Loader2 className="size-4 animate-spin text-text-muted" />
                  )}
                  <Select
                    value={q.status}
                    onValueChange={(v) => changeStatus(q.id, v as InquiryStatus)}
                    disabled={savingId === q.id}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.keys(INQUIRY_STATUS_META) as InquiryStatus[]
                      ).map((s) => (
                        <SelectItem key={s} value={s}>
                          {INQUIRY_STATUS_META[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
      <span className="shrink-0 text-text-muted">{label}</span>
      <span className="text-right text-foreground">{children}</span>
    </div>
  );
}
