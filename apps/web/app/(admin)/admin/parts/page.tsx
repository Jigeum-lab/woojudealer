"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  PackageX,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";

import { useRequireAuth } from "@/lib/auth-context";
import {
  deletePart,
  fetchAllParts,
  setStock,
  updatePart,
  uploadPartImage,
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
import { formatNumber, formatWon } from "@/lib/format";
import { PartImageCell } from "@/components/admin/part-image-cell";
import { PartEditorDialog } from "@/components/admin/part-editor-dialog";
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

/** 한 줄 페이지에 몇 건씩 — 화면에서 스크롤로 훑을 수 있는 정도 */
const PAGE_SIZE = 100;

/**
 * 가격을 며칠 지나면 낡은 것으로 볼지. 대표가 주 1~2회면 된다고 해서 7일.
 * 확인한 적 없는 부품(price_checked_at = null)은 무조건 낡은 것으로 친다.
 */
const STALE_DAYS = 7;

/**
 * 새로고침이 자동으로 훑는 최대 건수.
 *
 * 새로고침 한 번에 405건을 다 돌면 6분 넘게 걸리고 컴퓨존에도 한꺼번에 몰린다.
 * 오래된 것부터 이만큼만 훑고 나머지는 다음 새로고침으로 넘긴다 —
 * 주 1~2회 눌러 쓰는 리듬이면 며칠 안에 전체가 한 바퀴 돈다.
 */
const AUTO_REFRESH_LIMIT = 60;

/** 한 요청에 보내는 건수 — 서버 라우트의 상한과 맞춘다 */
const BATCH = 25;

function isCompuzone(part: Part): boolean {
  return !!part.link && part.link.includes("compuzone.co.kr");
}

/** 가격을 다시 확인해야 하는가 */
function isStale(part: Part): boolean {
  if (!isCompuzone(part)) return false;
  if (!part.priceCheckedAt) return true;
  const age = Date.now() - new Date(part.priceCheckedAt).getTime();
  return age > STALE_DAYS * 24 * 60 * 60 * 1000;
}

/** "3일 전" 같은 표기. 확인한 적 없으면 null */
function agoLabel(iso: string | null): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "오늘";
  if (days === 1) return "어제";
  return `${days}일 전`;
}

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
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  /** null = 닫힘 / "new" = 추가 / Part = 그 부품 상세 */
  const [editing, setEditing] = useState<Part | "new" | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [refreshing, setRefreshing] = useState<{ done: number; total: number } | null>(
    null
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async (): Promise<Part[] | null> => {
    try {
      const fresh = await fetchAllParts();
      setParts(fresh);
      return fresh;
    } catch {
      toast.error("부품 목록을 불러오지 못했습니다");
      return null;
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
    const stale = parts.filter(isStale).length;
    return { total: parts.length, soldOut, noStock, tracked, stale };
  }, [parts]);

  const runRefresh = useCallback(
    async (targets: Part[], opts?: { silentWhenEmpty?: boolean }) => {
      if (targets.length === 0) {
        if (!opts?.silentWhenEmpty) {
          toast.info("이 목록에는 컴퓨존 링크가 있는 부품이 없습니다");
        }
        return;
      }

      let updated = 0;
      let failed = 0;
      let gone = 0;
      setRefreshing({ done: 0, total: targets.length });

      try {
        for (let i = 0; i < targets.length; i += BATCH) {
          const chunk = targets.slice(i, i + BATCH);
          const res = await fetch("/api/parts/price-refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ partIds: chunk.map((p) => p.id) }),
          });
          if (!res.ok) {
            const { error } = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            throw new Error(error ?? `갱신 실패 (HTTP ${res.status})`);
          }
          const { results } = (await res.json()) as { results: { status: string }[] };
          updated += results.filter((r) => r.status === "updated").length;
          gone += results.filter((r) => r.status === "discontinued").length;
          failed += results.filter(
            (r) => r.status === "error" || r.status === "unparsable"
          ).length;
          setRefreshing({
            done: Math.min(i + BATCH, targets.length),
            total: targets.length,
          });
        }

        await reload();
        // 실패·단종을 감추지 않는다 — 다 맞춰진 줄 알고 견적을 내면 안 되므로.
        const parts = [`${updated}건 가격이 바뀌었습니다`];
        if (gone > 0) parts.push(`단종 ${gone}건`);
        if (failed > 0) parts.push(`확인 실패 ${failed}건`);
        toast.success(parts.join(" / "));
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "가격 갱신 실패");
      } finally {
        setRefreshing(null);
      }
    },
    [reload]
  );

  /**
   * 새로고침 — 목록을 다시 읽고, 낡은 가격이 있으면 이어서 긁어온다.
   *
   * 대표 요청(2026-08-24): "어드민에서 새로고침하면 가격도 업데이트되게".
   * 다만 누를 때마다 405건을 전부 훑으면 6분씩 걸리므로, 확인한 지 7일이 지난
   * 것부터 최대 60건만 돈다. 주 1~2회 누르는 리듬이면 며칠 안에 한 바퀴 돈다.
   */
  async function handleRefresh() {
    const fresh = await reload();
    const stale = (fresh ?? []).filter(isStale).slice(0, AUTO_REFRESH_LIMIT);
    if (stale.length === 0) {
      toast.success("목록을 새로고침했습니다 — 가격은 모두 최신입니다");
      return;
    }
    toast.info(`낡은 가격 ${stale.length}건을 확인합니다`);
    await runRefresh(stale, { silentWhenEmpty: true });
  }

  /** 목록에서 사진만 바로 교체 — 상세를 열지 않고 끝내는 쪽이 빠르다 */
  async function handleImage(part: Part, file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 올릴 수 있습니다");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("5MB 이하 이미지만 올릴 수 있습니다");
      return;
    }
    try {
      const url = await uploadPartImage(part.id, file);
      setParts((prev) =>
        prev.map((p) => (p.id === part.id ? { ...p, imageUrl: url } : p))
      );
      toast.success("사진을 바꿨습니다");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "사진 업로드 실패");
    }
  }

  /* ── 선택 ─────────────────────────────────────────────────────── */

  const selectedParts = useMemo(
    () => parts.filter((p) => selected.has(p.id)),
    [parts, selected]
  );

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** 머리글 체크박스 — 지금 페이지에 보이는 것만 다룬다. 안 보이는 400건이 딸려오면 위험하다 */
  function togglePage() {
    const ids = pageItems.map((p) => p.id);
    const allOn = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allOn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  /* ── 선택한 것 일괄 처리 ──────────────────────────────────────── */

  async function bulkDelete() {
    const targets = selectedParts;
    if (targets.length === 0) return;
    if (
      !window.confirm(
        `${formatNumber(targets.length)}개 부품을 삭제할까요?\n\n` +
          `추천 PC에 들어 있으면 그 구성에서도 빠집니다.\n` +
          `이미 발행한 견적서는 그대로 남습니다.`
      )
    ) {
      return;
    }
    setBulkBusy(true);
    let done = 0;
    try {
      for (const part of targets) {
        await deletePart(part.id);
        done++;
      }
      setParts((prev) => prev.filter((p) => !selected.has(p.id)));
      setSelected(new Set());
      toast.success(`${done}개 삭제했습니다`);
    } catch (err: unknown) {
      // 중간에 끊겨도 지워진 건 지워진 것이므로 목록을 다시 읽어 맞춘다
      await reload();
      setSelected(new Set());
      toast.error(
        `${done}개까지 삭제 후 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`
      );
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkSoldOut(soldOut: boolean) {
    const targets = selectedParts.filter((p) => p.soldOut !== soldOut);
    if (targets.length === 0) {
      toast.info(soldOut ? "이미 모두 품절입니다" : "이미 모두 판매중입니다");
      return;
    }
    setBulkBusy(true);
    try {
      for (const part of targets) {
        await updatePart(part.id, { soldOut });
      }
      setParts((prev) =>
        prev.map((p) => (selected.has(p.id) ? { ...p, soldOut } : p))
      );
      toast.success(
        `${targets.length}개를 ${soldOut ? "품절" : "판매중"}으로 바꿨습니다`
      );
    } catch {
      await reload();
      toast.error("일부만 반영됐습니다 — 목록을 다시 읽었습니다");
    } finally {
      setBulkBusy(false);
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
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" />
            부품 추가
          </Button>
          <Button
            variant="outline"
            onClick={() => runRefresh(filtered.filter(isCompuzone))}
            disabled={refreshing !== null}
            title="지금 목록 전체를 컴퓨존에서 다시 확인합니다"
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <TrendingUp className="size-4" />
            )}
            {refreshing
              ? `가격 확인 중 ${refreshing.done}/${refreshing.total}`
              : "전체 가격 갱신"}
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
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing !== null}
            title={`목록을 다시 읽고, ${STALE_DAYS}일 넘게 확인 안 한 가격을 이어서 갱신합니다`}
          >
            <RefreshCw className="size-4" />
            새로고침
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Stat label="전체 부품" value={formatNumber(stats.total)} />
        <Stat
          label={`가격 확인 필요 (${STALE_DAYS}일+)`}
          value={formatNumber(stats.stale)}
          tone={stats.stale > 0 ? "warn" : undefined}
        />
        <Stat label="공급사 품절" value={formatNumber(stats.soldOut)} tone="warn" />
        <Stat label="재고 0 / 등록" value={`${formatNumber(stats.noStock)} / ${formatNumber(stats.tracked)}`} />
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

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2.5">
          <span className="text-[13px] font-semibold text-foreground">
            {formatNumber(selected.size)}개 선택됨
          </span>
          <span className="mx-1 h-4 w-px bg-border" />

          <Button
            variant="outline"
            size="sm"
            disabled={bulkBusy || refreshing !== null}
            onClick={() => runRefresh(selectedParts.filter(isCompuzone))}
          >
            <TrendingUp className="size-4" />
            가격 갱신
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={bulkBusy}
            onClick={() => bulkSoldOut(true)}
          >
            <PackageX className="size-4" />
            품절 처리
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={bulkBusy}
            onClick={() => bulkSoldOut(false)}
          >
            판매중으로
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={bulkBusy}
            onClick={bulkDelete}
            className="text-destructive hover:text-destructive"
          >
            {bulkBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            삭제
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setSelected(new Set())}
          >
            <X className="size-4" />
            선택 해제
          </Button>
        </div>
      )}

      {!ready ? (
        <div className="flex items-center justify-center py-24 text-text-muted">
          <Loader2 className="mr-2 size-5 animate-spin" />
          불러오는 중…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border text-left text-[13px] text-text-muted">
                <th className="w-[44px] px-3 py-3">
                  <input
                    type="checkbox"
                    checked={
                      pageItems.length > 0 &&
                      pageItems.every((p) => selected.has(p.id))
                    }
                    onChange={togglePage}
                    className="size-4 cursor-pointer accent-primary"
                    aria-label="이 페이지 전체 선택"
                  />
                </th>
                <th className="w-[60px] px-2 py-3 font-semibold">사진</th>
                <th className="px-3 py-3 font-semibold">제품명</th>
                <th className="w-[120px] px-3 py-3 text-right font-semibold">판매가</th>
                <th className="w-[80px] px-2 py-3 text-center font-semibold">재고</th>
                <th className="w-[150px] px-3 py-3 font-semibold">상태</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((p) => {
                const checked = selected.has(p.id);
                return (
                  <tr
                    key={p.id}
                    onClick={() => setEditing(p)}
                    className={`cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/60 ${
                      checked ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(p.id)}
                        className="size-4 cursor-pointer accent-primary"
                        aria-label={`${p.name} 선택`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <PartImageCell
                        part={p}
                        onPick={(file) => handleImage(p, file)}
                      />
                    </td>
                    <td className="max-w-0 px-3 py-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {p.name}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-text-muted">
                        <span>{CATEGORY_META[p.category].label}</span>
                        {p.platform !== "common" && (
                          <span className="uppercase">· {p.platform}</span>
                        )}
                        {p.grade && <span>· {p.grade}</span>}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-mono text-[13.5px] text-foreground">
                        {formatWon(p.price)}
                      </span>
                      {p.listPrice != null && p.listPrice > p.price && (
                        <span className="ml-1.5 font-mono text-[11.5px] text-text-muted line-through">
                          {formatWon(p.listPrice)}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center text-[13px]">
                      {p.stock === null ? (
                        <span className="text-text-muted/60">—</span>
                      ) : (
                        <span
                          className={p.stock <= 0 ? "text-yellow-400" : "text-foreground"}
                        >
                          {formatNumber(p.stock)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
                        {p.soldOut && (
                          <span className="rounded border border-yellow-500/40 px-1.5 py-0.5 font-medium text-yellow-400">
                            품절
                          </span>
                        )}
                        {isCompuzone(p) ? (
                          <span
                            className={isStale(p) ? "text-yellow-400" : "text-text-muted"}
                            title={p.priceCheckedAt ?? "확인한 적 없음"}
                          >
                            {agoLabel(p.priceCheckedAt) ?? "가격 미확인"}
                          </span>
                        ) : (
                          <span className="text-text-muted/60" title="컴퓨존 링크가 아니라 자동 확인 대상이 아닙니다">
                            링크 없음
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
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
        <strong className="text-text-secondary">줄을 누르면 상세가 열립니다</strong> —
        제품명·분류·가격·정가·재고·품절·매입처 링크를 한 화면에서 고치고, 거기서 삭제도
        됩니다. 사진은 목록에서 바로 누르셔도 바뀝니다(5MB 이하 이미지, × 로 지움).
        <br />
        <strong className="text-text-secondary">여러 개 한 번에</strong> — 왼쪽 체크박스로
        고르면 위에 막대가 뜹니다. 고른 것만 가격 갱신·품절 처리·삭제할 수 있고, 머리글
        체크박스는 <strong className="text-text-secondary">지금 페이지에 보이는 것만</strong>{" "}
        고릅니다(안 보이는 수백 건이 딸려오지 않게).
        <br />
        <strong className="text-text-secondary">부품 추가</strong>는 오른쪽 위 버튼, 여러 건을
        한꺼번에 넣으려면 아래 CSV를 쓰세요. 지운 부품이 들어간{" "}
        <strong className="text-text-secondary">이미 발행한 견적서는 그대로 남습니다</strong>
        (품목명·단가를 따로 저장해 둡니다). 다만 추천 PC에 들어 있으면 그 구성에서는
        빠지므로, 삭제할 때 알려드립니다.
        <br />
        <br />
        <strong className="text-text-secondary">새로고침</strong> — 목록을 다시 읽고,
        확인한 지 {STALE_DAYS}일이 지난 가격을 오래된 것부터 최대 {AUTO_REFRESH_LIMIT}건까지
        컴퓨존에서 확인해 맞춥니다. 주 1~2회 눌러 두면 며칠 안에 전체가 한 바퀴 돕니다.
        <br />
        <strong className="text-text-secondary">전체 가격 갱신</strong> — 기다리지 않고
        지금 목록 전체를 다시 확인합니다(분류를 좁히면 그만큼만). 건당 0.7초 간격으로
        순차 조회하며, 단종 상품은 건드리지 않고 건너뜁니다. 바뀐 가격은 이력에 남습니다.
        <br />
        <br />
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

      {editing && (
        <PartEditorDialog
          part={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            // 목록에 있으면 그 자리를 갈아끼우고, 새로 만든 것이면 다시 읽는다
            setParts((prev) =>
              prev.some((p) => p.id === saved.id)
                ? prev.map((p) => (p.id === saved.id ? saved : p))
                : prev
            );
            if (editing === "new") void reload();
          }}
          onDeleted={(id) => {
            setEditing(null);
            setParts((prev) => prev.filter((p) => p.id !== id));
            setSelected((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
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
/**
 * 표 안의 사진 칸.
 *
 * 썸네일을 누르면 바로 파일 선택이 열린다 — 대표가 잘못 붙은 사진을 한 장씩
 * 갈아끼우는 게 주 용도라, 편집 화면을 따로 열지 않고 그 자리에서 끝낸다.
 */
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
