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
  ImagePlus,
  Search,
  Trash2,
  TrendingUp,
  Upload,
} from "lucide-react";

import { useRequireAuth } from "@/lib/auth-context";
import {
  clearPartImage,
  deletePart,
  fetchAllParts,
  setStock,
  templatesUsingPart,
  updatePart,
  uploadPartImage,
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
import { PartImage } from "@/components/inquiry/part-image";
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
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
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
   * 주어진 부품들의 현재가를 컴퓨존에서 확인해 단가를 맞춘다.
   *
   * 25건씩 끊어 보내고 서버가 순차 + 간격을 두고 훑는다 — 서버리스 실행 시간 안에
   * 들어와야 하고, 컴퓨존 쪽에도 한꺼번에 몰지 않기 위해서다(예전 IP 차단 이력).
   */
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

  /**
   * 사진 교체.
   *
   * 기존 사진은 레포 안 정적 파일이라 대표가 손댈 수 없었다(피드백 2026-08-25:
   * "부품 그림이 안 맞아서 다른 게 많은데 어떻게 수정하죠?").
   * 여기서 고른 파일은 Storage로 올라가고 그 자리에서 바뀐다.
   */
  async function handleImage(part: Part, file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 올릴 수 있습니다");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("5MB 이하 이미지만 올릴 수 있습니다");
      return;
    }
    setSavingId(part.id);
    try {
      const url = await uploadPartImage(part.id, file);
      setParts((prev) =>
        prev.map((p) => (p.id === part.id ? { ...p, imageUrl: url } : p))
      );
      toast.success("사진을 바꿨습니다");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "사진 업로드 실패");
    } finally {
      setSavingId(null);
    }
  }

  async function handleClearImage(part: Part) {
    setSavingId(part.id);
    try {
      await clearPartImage(part.id);
      setParts((prev) =>
        prev.map((p) => (p.id === part.id ? { ...p, imageUrl: null } : p))
      );
      toast.success("사진을 지웠습니다");
    } catch {
      toast.error("사진을 지우지 못했습니다");
    } finally {
      setSavingId(null);
    }
  }

  /**
   * 부품 삭제.
   *
   * 과거 견적서는 안전하다 — 품목 이름·단가를 스냅샷으로 들고 있어서 부품이 사라져도
   * 그대로 남는다. 다만 추천 PC에 들어 있으면 그 구성에서 빠지므로 미리 알린다.
   */
  async function handleDelete(part: Part) {
    let used: string[] = [];
    try {
      used = await templatesUsingPart(part.id);
    } catch {
      /* 조회 실패는 삭제를 막을 이유가 아니다 — 경고만 못 붙인다 */
    }

    const warn =
      used.length > 0
        ? `\n\n주의: 추천 PC(${used.join(", ")})에서도 빠집니다.`
        : "";
    if (
      !window.confirm(
        `"${part.name}"을(를) 삭제할까요?${warn}\n\n이미 발행한 견적서는 그대로 남습니다.`
      )
    ) {
      return;
    }

    setSavingId(part.id);
    try {
      await deletePart(part.id);
      setParts((prev) => prev.filter((p) => p.id !== part.id));
      toast.success("삭제했습니다");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
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

      {!ready ? (
        <div className="flex items-center justify-center py-24 text-text-muted">
          <Loader2 className="mr-2 size-5 animate-spin" />
          불러오는 중…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[1160px]">
            <thead>
              <tr className="border-b border-border text-left text-[13px] text-text-muted">
                <th className="w-[64px] px-3 py-3 font-semibold">사진</th>
                <th className="w-[110px] px-4 py-3 font-semibold">분류</th>
                <th className="px-4 py-3 font-semibold">제품명</th>
                <th className="w-[70px] px-2 py-3 text-center font-semibold">등급</th>
                <th className="w-[120px] px-3 py-3 text-right font-semibold">
                  정가
                </th>
                <th className="w-[130px] px-3 py-3 text-right font-semibold">판매가</th>
                <th className="w-[92px] px-2 py-3 text-center font-semibold">가격확인</th>
                <th className="w-[90px] px-2 py-3 text-center font-semibold">재고</th>
                <th className="w-[90px] px-2 py-3 text-center font-semibold">품절</th>
                <th className="w-[52px] px-2 py-3 text-center font-semibold">삭제</th>
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
                  <td className="px-3 py-2">
                    <PartImageCell
                      part={p}
                      onPick={(file) => handleImage(p, file)}
                      onClear={() => handleClearImage(p)}
                    />
                  </td>
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
                  <td className="px-2 py-2 text-center">
                    {isCompuzone(p) ? (
                      <span
                        className={`text-[12px] ${
                          isStale(p) ? "text-yellow-400" : "text-text-muted"
                        }`}
                        title={p.priceCheckedAt ?? "확인한 적 없음"}
                      >
                        {agoLabel(p.priceCheckedAt) ?? "미확인"}
                      </span>
                    ) : (
                      <span className="text-[12px] text-text-muted/60" title="컴퓨존 링크가 아니라 자동 확인 대상이 아닙니다">
                        —
                      </span>
                    )}
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
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      disabled={savingId === p.id}
                      aria-label={`${p.name} 삭제`}
                      title="이 부품을 목록에서 지웁니다"
                      className="cursor-pointer text-text-muted transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="size-4" />
                    </button>
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
        <strong className="text-text-secondary">사진 바꾸기</strong> — 왼쪽 사진을 누르면
        파일 선택이 열립니다. 고르면 그 자리에서 바뀝니다(5MB 이하 이미지). 사진 위로
        마우스를 올리면 뜨는 × 로 지울 수 있습니다.
        <br />
        <strong className="text-text-secondary">부품 추가·삭제</strong> — 오른쪽 위{" "}
        <strong className="text-text-secondary">부품 추가</strong> 버튼으로 한 건씩 넣고,
        각 줄 맨 오른쪽 휴지통으로 지웁니다. 여러 건을 한 번에 넣으려면 아래 CSV를 쓰세요.
        지운 부품이 들어간 <strong className="text-text-secondary">이미 발행한 견적서는
        그대로 남습니다</strong>(품목명·단가를 따로 저장해 둡니다). 다만 추천 PC에 들어
        있으면 그 구성에서는 빠지므로, 삭제할 때 알려드립니다.
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
/**
 * 표 안의 사진 칸.
 *
 * 썸네일을 누르면 바로 파일 선택이 열린다 — 대표가 잘못 붙은 사진을 한 장씩
 * 갈아끼우는 게 주 용도라, 편집 화면을 따로 열지 않고 그 자리에서 끝낸다.
 */
function PartImageCell({
  part,
  onPick,
  onClear,
}: {
  part: Part;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="group relative w-fit">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        title={part.imageUrl ? "눌러서 사진 바꾸기" : "눌러서 사진 넣기"}
        className="block cursor-pointer rounded-md ring-offset-2 ring-offset-card transition-shadow hover:ring-2 hover:ring-primary"
      >
        {part.imageUrl ? (
          <PartImage
            src={part.imageUrl}
            alt={part.name}
            category={part.category}
            size={40}
          />
        ) : (
          <span className="flex size-10 items-center justify-center rounded-md border border-dashed border-border-strong text-text-muted">
            <ImagePlus className="size-4" />
          </span>
        )}
      </button>
      {part.imageUrl && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`${part.name} 사진 지우기`}
          title="사진 지우기"
          className="absolute -right-1.5 -top-1.5 hidden size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white group-hover:flex"
        >
          ×
        </button>
      )}
    </div>
  );
}

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
