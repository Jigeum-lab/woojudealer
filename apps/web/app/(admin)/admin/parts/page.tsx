"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";

import { useRequireAuth } from "@/lib/auth-context";
import {
  fetchAllParts,
  setStock,
  updatePart,
  upsertPart,
  upsertParts,
  type PartUpsertInput,
} from "@/lib/db/parts";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  type Part,
  type PartCategory,
  type PartPlatform,
} from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

/** 한 줄 페이지에 몇 건씩 — 화면에서 스크롤로 훑을 수 있는 정도 */
const PAGE_SIZE = 100;

/** 내보내기·가져오기 공용 컬럼. 이 순서를 바꾸면 대표가 쓰던 파일이 깨진다. */
const CSV_HEADER = [
  "고유번호",
  "분류",
  "플랫폼",
  "제품명",
  "판매가",
  "정가",
  "품절",
  "재고",
] as const;

const PLATFORM_LABEL: Record<PartPlatform, string> = {
  amd: "AMD",
  intel: "INTEL",
  common: "공용",
};

/** 한글 분류명 → 코드. 대표가 엑셀에서 쓰는 표기를 그대로 받기 위해. */
const CATEGORY_BY_LABEL = new Map<string, PartCategory>(
  CATEGORY_ORDER.map((c) => [CATEGORY_META[c].label, c])
);

const PLATFORM_BY_LABEL = new Map<string, PartPlatform>([
  ["AMD", "amd"],
  ["INTEL", "intel"],
  ["INTEL/AMD", "common"],
  ["공용", "common"],
  ["", "common"],
]);

/** 콤마·따옴표가 들어가도 깨지지 않게 감싼다 */
function csvCell(value: string | number | null): string {
  const v = value === null ? "" : String(value);
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function partsToCsv(parts: Part[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const p of parts) {
    lines.push(
      [
        p.partNo ?? "",
        CATEGORY_META[p.category].label,
        PLATFORM_LABEL[p.platform],
        p.name,
        p.price,
        p.listPrice ?? "",
        p.soldOut ? "Y" : "N",
        p.stock ?? "",
      ]
        .map(csvCell)
        .join(",")
    );
  }
  return lines.join("\n");
}

/** "1,234원" 같은 표기도 받는다 — 엑셀에서 서식이 붙은 채로 나오기 때문 */
function parseWon(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return null;
  const n = Number(digits);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export default function AdminPartsPage() {
  const { authorized } = useRequireAuth("admin");

  const [parts, setParts] = useState<Part[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | PartCategory>("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
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

  // 검색·분류를 바꾸면 보던 페이지 번호는 의미가 없어진다.
  // effect로 되돌리면 이전 페이지가 한 번 그려졌다 바뀌므로 렌더 중에 맞춘다.
  const filterKey = `${query}|${category}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    [filtered, current]
  );

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

  /** 지금 화면의 필터 결과를 그대로 CSV로 내려받는다 — 고쳐서 다시 올리면 반영된다 */
  function exportCsv() {
    // BOM을 붙여야 엑셀이 한글을 깨지 않고 연다
    const blob = new Blob(["\uFEFF" + partsToCsv(filtered)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `부품단가_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${formatNumber(filtered.length)}건 내보냈습니다`);
  }

  /**
   * CSV 일괄 반영.
   *
   * 두 가지 형식을 받는다.
   *  1) 내보내기와 같은 전체 형식 — 헤더에 "제품명"이 있으면 이쪽. 신규는 추가되고
   *     기존은 갱신된다. 부품 추가를 화면에서 한 건씩 하지 않아도 되게 하려는 것.
   *  2) `고유번호,가격` 두 칸 — 가격만 몇십 건 고칠 때 쓰던 기존 형식. 그대로 둔다.
   *
   * 재고는 parts가 아니라 inventory에 있어 별도로 저장한다.
   */
  async function handleCsv(file: File) {
    setUploading(true);
    try {
      const text = await file.text();
      const rows = text
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .filter((l) => l.trim());
      if (rows.length === 0) {
        toast.info("빈 파일입니다");
        return;
      }

      const header = splitCsvLine(rows[0]);
      const isFull = header.includes("제품명");

      if (isFull) {
        await importFull(rows, header);
      } else {
        await importPriceOnly(rows);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "CSV 처리 실패");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /** 전체 형식 — 추가 + 수정 */
  async function importFull(rows: string[], header: string[]) {
    const col = (name: string) => header.indexOf(name);
    const iNo = col("고유번호");
    const iCat = col("분류");
    const iPlat = col("플랫폼");
    const iName = col("제품명");
    const iPrice = col("판매가");
    const iList = col("정가");
    const iSold = col("품절");
    const iStock = col("재고");

    if (iCat < 0 || iName < 0 || iPrice < 0) {
      toast.error("분류·제품명·판매가 칸이 있어야 합니다");
      return;
    }

    const byKey = new Map(parts.map((p) => [`${p.category}|${p.name.trim()}`, p]));
    const upserts: PartUpsertInput[] = [];
    const stockChanges: { key: string; quantity: number }[] = [];
    const skipped: string[] = [];
    let added = 0;

    for (const line of rows.slice(1)) {
      const c = splitCsvLine(line);
      const name = (c[iName] ?? "").trim();
      const category = CATEGORY_BY_LABEL.get((c[iCat] ?? "").trim());
      const price = parseWon(c[iPrice] ?? "");

      if (!name || !category || price === null) {
        if (name) skipped.push(name);
        continue;
      }

      const key = `${category}|${name}`;
      const existing = byKey.get(key);
      const platform =
        (iPlat >= 0
          ? PLATFORM_BY_LABEL.get((c[iPlat] ?? "").trim().toUpperCase())
          : undefined) ??
        existing?.platform ??
        "common";
      const partNoRaw = iNo >= 0 ? (c[iNo] ?? "").replace(/[^\d]/g, "") : "";

      upserts.push({
        partNo: partNoRaw ? Number(partNoRaw) : existing?.partNo ?? null,
        category,
        platform,
        name,
        price,
        listPrice: iList >= 0 ? parseWon(c[iList] ?? "") : existing?.listPrice ?? null,
        soldOut:
          iSold >= 0
            ? /^(y|yes|true|1|품절|o)$/i.test((c[iSold] ?? "").trim())
            : existing?.soldOut ?? false,
        grade: existing?.grade ?? null,
        link: existing?.link ?? null,
      });
      if (!existing) added++;

      if (iStock >= 0) {
        const q = (c[iStock] ?? "").trim();
        if (q !== "" && Number.isFinite(Number(q)) && Number(q) >= 0) {
          stockChanges.push({ key, quantity: Number(q) });
        }
      }
    }

    if (upserts.length === 0) {
      toast.info("반영할 행이 없습니다");
      return;
    }

    await upsertParts(upserts);

    // 재고는 부품 id가 있어야 해서 반영 후 다시 읽어 맞춘다
    if (stockChanges.length > 0) {
      const fresh = await fetchAllParts();
      const idByKey = new Map(
        fresh.map((p) => [`${p.category}|${p.name.trim()}`, p])
      );
      for (const ch of stockChanges) {
        const part = idByKey.get(ch.key);
        if (part && part.stock !== ch.quantity) {
          await setStock(part.id, ch.quantity);
        }
      }
      setParts(fresh);
    } else {
      await reload();
    }

    // 건너뛴 행은 조용히 넘기지 않는다 — 반영됐다고 오해하면 안 되므로.
    toast.success(
      `${formatNumber(upserts.length)}건 반영 (신규 ${added}건)` +
        (skipped.length > 0 ? ` / ${skipped.length}건은 분류·가격을 못 읽어 건너뜀` : "")
    );
  }

  /** 기존 두 칸 형식 — 가격만 */
  async function importPriceOnly(rows: string[]) {
    const byNo = new Map(
      parts.filter((p) => p.partNo !== null).map((p) => [String(p.partNo), p])
    );
    const byName = new Map(parts.map((p) => [p.name.trim().toLowerCase(), p]));

    const updates: { part: Part; price: number }[] = [];
    const unmatched: string[] = [];

    for (const line of rows) {
      const cols = splitCsvLine(line);
      if (cols.length < 2) continue;
      const key = cols[0];
      const price = parseWon(cols[1]);
      if (!key || price === null || price <= 0) continue;

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

    for (const u of updates) {
      await updatePart(u.part.id, { price: u.price });
    }
    await reload();

    toast.success(
      `${updates.length}건 가격 갱신 완료` +
        (unmatched.length > 0
          ? ` / ${unmatched.length}건은 일치하는 부품이 없어 건너뜀`
          : "")
    );
  }

  if (!authorized) return null;

  return (
    <div className="mx-auto w-full max-w-[1280px] py-8 px-4 sm:px-6 md:px-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">부품·재고 관리</h1>
          <p className="mt-1 text-sm text-text-secondary">
            가격·품절·재고를 직접 고치거나, CSV로 내려받아 고쳐서 한 번에 올립니다
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
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="size-4" />
            부품 추가
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="size-4" />
            CSV 내보내기
          </Button>
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            CSV 가져오기
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
              {pageItems.map((p) => (
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
          {filtered.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <p className="text-[13px] text-text-muted">
                {formatNumber((current - 1) * PAGE_SIZE + 1)}–
                {formatNumber(Math.min(current * PAGE_SIZE, filtered.length))} /{" "}
                {formatNumber(filtered.length)}건
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(current - 1)}
                    disabled={current <= 1}
                  >
                    <ChevronLeft className="size-4" />
                    이전
                  </Button>
                  <span className="px-1 text-[13px] text-text-secondary">
                    {current} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(current + 1)}
                    disabled={current >= totalPages}
                  >
                    다음
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-[13px] leading-relaxed text-text-muted">
        <strong className="text-text-secondary">CSV로 한 번에 고치기</strong> — 내보내기로
        받은 파일을 엑셀에서 고쳐 그대로 다시 올리면 됩니다. 없는 제품명은 새로 추가되고,
        있는 제품은 갱신됩니다 (분류+제품명이 같으면 같은 부품으로 봅니다).
        <br />
        칸:{" "}
        <code className="text-text-secondary">
          고유번호,분류,플랫폼,제품명,판매가,정가,품절,재고
        </code>{" "}
        · 품절은 Y/N · 정가·재고는 비워도 됩니다.
        <br />
        <code className="text-text-secondary">고유번호,가격</code> 두 칸짜리 파일도 그대로
        받습니다(가격만 갱신). 엑셀 원본 전체를 다시 반영하려면{" "}
        <code className="text-text-secondary">
          python3 scripts/import_parts.py &lt;엑셀경로&gt;
        </code>
        . 가격이 바뀐 항목은 자동으로 이력에 남습니다.
      </p>

      {showAdd && (
        <AddPartDialog
          onClose={() => setShowAdd(false)}
          onSaved={async () => {
            setShowAdd(false);
            await reload();
          }}
        />
      )}

    </div>
  );
}

/**
 * 부품 한 건 추가.
 *
 * 분류+제품명이 이미 있으면 새로 만들지 않고 그 행을 고친다 — 자연키가 그 조합이라
 * 같은 이름을 또 넣어도 중복 행이 생기지 않는다.
 * 스펙(호환성 판정에 쓰는 값)은 여기서 받지 않는다. 엑셀 임포트로 들어온 칸이라
 * 화면에서 손으로 채우게 하면 카테고리마다 키가 달라 틀리기 쉽다.
 */
function AddPartDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    category: "" as "" | PartCategory,
    platform: "common" as PartPlatform,
    name: "",
    price: "",
    listPrice: "",
    partNo: "",
    link: "",
  });
  const [saving, setSaving] = useState(false);

  const platformBound = form.category === "cpu" || form.category === "mainboard";

  async function save() {
    const price = parseWon(form.price);
    if (!form.category) {
      toast.error("분류를 선택해주세요");
      return;
    }
    if (!form.name.trim()) {
      toast.error("제품명을 입력해주세요");
      return;
    }
    if (price === null) {
      toast.error("판매가를 숫자로 입력해주세요");
      return;
    }

    setSaving(true);
    try {
      await upsertPart({
        partNo: form.partNo.trim() ? Number(form.partNo.replace(/[^\d]/g, "")) : null,
        category: form.category,
        platform: platformBound ? form.platform : "common",
        name: form.name.trim(),
        price,
        listPrice: parseWon(form.listPrice),
        link: form.link.trim() || null,
      });
      toast.success("부품을 저장했습니다");
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "저장 실패");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>부품 추가</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>분류 *</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category: v as PartCategory }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_META[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>플랫폼</Label>
              <Select
                value={form.platform}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, platform: v as PartPlatform }))
                }
                disabled={!platformBound}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amd">AMD</SelectItem>
                  <SelectItem value="intel">INTEL</SelectItem>
                  <SelectItem value="common">공용</SelectItem>
                </SelectContent>
              </Select>
              {!platformBound && (
                <p className="text-[11.5px] text-text-muted">
                  CPU·마더보드만 플랫폼을 탑니다
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>제품명 *</Label>
            <Input
              autoFocus
              placeholder="예) AMD Ryzen™ 5 Vermeer 5600"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>판매가 *</Label>
              <Input
                inputMode="numeric"
                placeholder="170000"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>정가</Label>
              <Input
                inputMode="numeric"
                placeholder="비우면 할인 표기 없음"
                value={form.listPrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, listPrice: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>고유번호</Label>
              <Input
                inputMode="numeric"
                placeholder="선택"
                value={form.partNo}
                onChange={(e) => setForm((f) => ({ ...f, partNo: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>매입처 링크</Label>
            <Input
              placeholder="https://www.compuzone.co.kr/..."
              value={form.link}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
