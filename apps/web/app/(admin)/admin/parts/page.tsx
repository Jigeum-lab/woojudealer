"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Search, Upload } from "lucide-react";

import { useRequireAuth } from "@/lib/auth-context";
import { fetchAllParts, setStock, updatePart } from "@/lib/db/parts";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  type Part,
  type PartCategory,
} from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** CSV 한 줄을 따옴표까지 고려해 쪼갠다 */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export default function AdminPartsPage() {
  const { authorized } = useRequireAuth("admin");

  const [parts, setParts] = useState<Part[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | PartCategory>("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      setParts(await fetchAllParts());
    } catch {
      toast.error("부품 목록을 불러오지 못했습니다");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parts.filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!q || p.name.toLowerCase().includes(q) || String(p.partNo ?? "").includes(q))
    );
  }, [parts, query, category]);

  const stats = useMemo(() => {
    const soldOut = parts.filter((p) => p.soldOut).length;
    const noStock = parts.filter((p) => p.stock !== null && p.stock <= 0).length;
    const tracked = parts.filter((p) => p.stock !== null).length;
    return { total: parts.length, soldOut, noStock, tracked };
  }, [parts]);

  /** 낙관적 갱신 — 실패하면 되돌린다 */
  async function patch(part: Part, changes: Partial<Part>) {
    const before = parts;
    setParts((prev) => prev.map((p) => (p.id === part.id ? { ...p, ...changes } : p)));
    setSavingId(part.id);
    try {
      if (
        changes.price !== undefined ||
        changes.listPrice !== undefined ||
        changes.soldOut !== undefined
      ) {
        await updatePart(part.id, {
          price: changes.price,
          listPrice: changes.listPrice,
          soldOut: changes.soldOut,
        });
      }
      if (changes.stock !== undefined && changes.stock !== null) {
        await setStock(part.id, changes.stock);
      }
    } catch (err: unknown) {
      setParts(before);
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSavingId(null);
    }
  }

  /**
   * CSV 일괄 가격 갱신.
   * 형식: 고유번호,가격  또는  제품명,가격 (헤더 있어도 무시된다)
   *
   * 엑셀 전체를 다시 넣으려면 scripts/import_parts.py 를 쓴다.
   * 이 화면은 "가격만 몇십 건 바뀌었을 때" 빠르게 반영하는 용도다.
   */
  async function handleCsv(file: File) {
    setUploading(true);
    try {
      const text = await file.text();
      const rows = text.split(/\r?\n/).filter((l) => l.trim());

      const byNo = new Map(parts.filter((p) => p.partNo !== null).map((p) => [String(p.partNo), p]));
      const byName = new Map(parts.map((p) => [p.name.trim().toLowerCase(), p]));

      const updates: { part: Part; price: number }[] = [];
      const unmatched: string[] = [];

      for (const line of rows) {
        const cols = splitCsvLine(line);
        if (cols.length < 2) continue;
        const key = cols[0];
        const price = Number(cols[1].replace(/[^\d]/g, ""));
        if (!key || !Number.isFinite(price) || price <= 0) continue;

        const part = byNo.get(key) ?? byName.get(key.toLowerCase());
        if (!part) {
          unmatched.push(key);
          continue;
        }
        if (part.price !== price) updates.push({ part, price });
      }

      if (updates.length === 0) {
        toast.info(
          unmatched.length > 0
            ? `일치하는 부품이 없습니다 (${unmatched.length}건 미매칭)`
            : "변경된 가격이 없습니다"
        );
        return;
      }

      let done = 0;
      for (const u of updates) {
        await updatePart(u.part.id, { price: u.price });
        done++;
      }
      await reload();

      // 매칭 실패는 조용히 넘기지 않는다 — 갱신했다고 오해하면 안 되므로.
      toast.success(
        `${done}건 가격 갱신 완료` +
          (unmatched.length > 0 ? ` / ${unmatched.length}건은 일치하는 부품이 없어 건너뜀` : "")
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "CSV 처리 실패");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!authorized) return null;

  return (
    <div className="mx-auto w-full max-w-[1280px] py-8 px-4 sm:px-6 md:px-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">부품·재고 관리</h1>
          <p className="mt-1 text-sm text-text-secondary">
            가격·품절·재고 수량을 직접 수정하거나 CSV로 한 번에 갱신합니다
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleCsv(f);
            }}
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            CSV 가격 갱신
          </Button>
          <Button variant="outline" onClick={reload}>
            <RefreshCw className="size-4" />
            새로고침
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Stat label="전체 부품" value={formatNumber(stats.total)} />
        <Stat label="공급사 품절" value={formatNumber(stats.soldOut)} tone="warn" />
        <Stat label="재고 등록됨" value={formatNumber(stats.tracked)} />
        <Stat label="재고 0" value={formatNumber(stats.noStock)} tone="warn" />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="제품명·고유번호 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="전체 분류" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 분류</SelectItem>
            {CATEGORY_ORDER.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_META[c].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="flex items-center px-2 text-[13px] text-text-muted">
          {formatNumber(filtered.length)}건
        </span>
      </div>

      {!ready ? (
        <div className="flex items-center justify-center py-24 text-text-muted">
          <Loader2 className="mr-2 size-5 animate-spin" />
          불러오는 중…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[940px]">
            <thead>
              <tr className="border-b border-border text-left text-[13px] text-text-muted">
                <th className="w-[110px] px-4 py-3 font-semibold">분류</th>
                <th className="px-4 py-3 font-semibold">제품명</th>
                <th className="w-[70px] px-2 py-3 text-center font-semibold">등급</th>
                <th className="w-[120px] px-3 py-3 text-right font-semibold">
                  정가
                </th>
                <th className="w-[130px] px-3 py-3 text-right font-semibold">판매가</th>
                <th className="w-[90px] px-2 py-3 text-center font-semibold">재고</th>
                <th className="w-[90px] px-2 py-3 text-center font-semibold">품절</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 300).map((p) => (
                <tr
                  key={p.id}
                  className={`border-b border-border/60 last:border-0 ${
                    savingId === p.id ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-4 py-2 text-[13px] text-text-secondary">
                    {CATEGORY_META[p.category].label}
                  </td>
                  <td className="max-w-0 truncate px-4 py-2 text-sm text-foreground">
                    {p.name}
                  </td>
                  <td className="px-2 py-2 text-center text-[12px] text-text-muted">
                    {p.grade ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {/* 비워두면 할인 표기가 아예 안 나간다 — 없는 할인을 만들지 않기 위해 */}
                    <Input
                      type="number"
                      min={0}
                      placeholder="—"
                      defaultValue={p.listPrice ?? ""}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        const v = raw === "" ? null : Number(raw);
                        if (v !== null && (!Number.isFinite(v) || v < 0)) return;
                        if (v !== p.listPrice) patch(p, { listPrice: v });
                      }}
                      className="h-8 text-right text-[13px] text-text-muted"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      defaultValue={p.price}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v >= 0 && v !== p.price) {
                          patch(p, { price: v });
                        }
                      }}
                      className="h-8 text-right text-[13px]"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="—"
                      defaultValue={p.stock ?? ""}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        if (raw === "") return;
                        const v = Number(raw);
                        if (Number.isFinite(v) && v >= 0 && v !== p.stock) {
                          patch(p, { stock: v });
                        }
                      }}
                      className="h-8 text-center text-[13px]"
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={p.soldOut}
                      onChange={(e) => patch(p, { soldOut: e.target.checked })}
                      className="size-4 cursor-pointer accent-yellow-500"
                      aria-label={`${p.name} 품절 여부`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 300 && (
            <p className="border-t border-border px-4 py-3 text-[13px] text-text-muted">
              {formatNumber(filtered.length)}건 중 300건만 표시했습니다 — 검색이나 분류로 좁혀주세요
            </p>
          )}
        </div>
      )}

      <p className="mt-4 text-[13px] leading-relaxed text-text-muted">
        CSV 형식: <code className="text-text-secondary">고유번호,가격</code> 또는{" "}
        <code className="text-text-secondary">제품명,가격</code> (헤더 줄이 있어도 무시됩니다).
        <br />
        엑셀 전체를 다시 반영하려면{" "}
        <code className="text-text-secondary">
          python3 scripts/import_parts.py &lt;엑셀경로&gt;
        </code>{" "}
        를 실행하세요. 가격이 바뀐 항목은 자동으로 이력에 남습니다.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-[12px] text-text-muted">{label}</p>
      <p
        className={`mt-0.5 text-xl font-extrabold ${
          tone === "warn" ? "text-yellow-400" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
