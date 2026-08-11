"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileText, Loader2, Plus } from "lucide-react";

import { useRequireAuth } from "@/lib/auth-context";
import { fetchQuotes } from "@/lib/db/quotes";
import { QUOTE_STATUS_META, type Quote } from "@/lib/types";
import { formatDate, formatWon } from "@/lib/format";
import { Button } from "@/components/ui/button";

export default function QuotesPage() {
  const { authorized } = useRequireAuth("admin");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetchQuotes()
      .then(setQuotes)
      .catch(() => toast.error("견적 목록을 불러오지 못했습니다"))
      .finally(() => setReady(true));
  }, []);

  if (!authorized) return null;

  return (
    <div className="mx-auto w-full max-w-[1280px] py-8 px-4 sm:px-6 md:px-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-foreground">견적 관리</h1>
        <Button asChild variant="cta">
          <Link href="/quotes/new">
            <Plus className="size-4" />
            새 견적
          </Link>
        </Button>
      </div>

      {!ready ? (
        <div className="flex items-center justify-center py-24 text-text-muted">
          <Loader2 className="mr-2 size-5 animate-spin" />
          불러오는 중…
        </div>
      ) : quotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center">
          <FileText className="mx-auto mb-3 size-8 text-text-muted" />
          <p className="text-sm text-text-secondary">아직 작성한 견적이 없습니다</p>
          <Button asChild variant="cta" className="mt-4">
            <Link href="/quotes/new">첫 견적 작성하기</Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {quotes.map((q) => {
            const status = QUOTE_STATUS_META[q.status];
            return (
              <li key={q.id}>
                <Link
                  href={`/quotes/${q.displayNo}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{q.displayNo}</span>
                      <span className={`text-[12px] font-semibold ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="rounded border border-border px-1.5 text-[11px] text-text-muted">
                        {q.platform.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-text-secondary">
                      {q.customerName} · {q.items.length}개 품목 · {formatDate(q.quoteDate)}
                    </p>
                  </div>
                  <span className="text-lg font-extrabold text-primary">
                    {formatWon(q.total)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
