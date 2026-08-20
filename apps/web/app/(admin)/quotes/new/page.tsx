"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { useAuth, useRequireAuth } from "@/lib/auth-context";
import { fetchAllParts } from "@/lib/db/parts";
import { createQuote } from "@/lib/db/quotes";
import { fetchTemplates, type QuoteTemplate } from "@/lib/db/templates";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  PLATFORM_BOUND,
  type Part,
  type PartCategory,
  type PartPlatform,
} from "@/lib/types";
import { checkCompatibility, hasBlockingIssue } from "@/lib/quote/compatibility";
import { totalsFromSelection } from "@/lib/quote/totals";
import { formatWon } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Selection = Partial<Record<PartCategory, Part>>;
type Quantities = Partial<Record<PartCategory, number>>;

/** 부품 선택 다이얼로그 */
function PartPicker({
  category,
  parts,
  onPick,
  onClose,
}: {
  category: PartCategory;
  parts: Part[];
  onPick: (part: Part) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parts;
    return parts.filter((p) => p.name.toLowerCase().includes(q));
  }, [parts, query]);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[80vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{CATEGORY_META[category].label} 선택</DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <Input
              autoFocus
              placeholder="제품명 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="mt-2 text-[13px] text-text-muted">{filtered.length}개 품목</p>
        </div>

        <div className="max-h-[52vh] overflow-y-auto px-6 pb-6 pt-2">
          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-text-muted">
              검색 결과가 없습니다
            </p>
          )}
          <ul className="flex flex-col gap-1.5">
            {filtered.map((part) => {
              const unavailable = part.soldOut || (part.stock !== null && part.stock <= 0);
              return (
                <li key={part.id}>
                  <button
                    type="button"
                    onClick={() => onPick(part)}
                    className="flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {part.name}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {part.grade && (
                          <Badge variant="outline" className="text-[11px]">
                            {part.grade}
                          </Badge>
                        )}
                        {part.soldOut && (
                          <Badge variant="outline" className="border-yellow-500/40 text-[11px] text-yellow-400">
                            공급사 품절
                          </Badge>
                        )}
                        {part.stock !== null && (
                          <span className="text-[11px] text-text-muted">
                            재고 {part.stock}개
                          </span>
                        )}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 text-sm font-bold ${
                        unavailable ? "text-text-muted" : "text-foreground"
                      }`}
                    >
                      {formatWon(part.price)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function NewQuotePage() {
  const { authorized } = useRequireAuth("admin");
  const { user, company } = useAuth();
  const router = useRouter();

  const [allParts, setAllParts] = useState<Part[]>([]);
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [ready, setReady] = useState(false);
  const [platform, setPlatform] = useState<PartPlatform>("amd");
  const [selection, setSelection] = useState<Selection>({});
  const [quantities, setQuantities] = useState<Quantities>({});
  const [customerName, setCustomerName] = useState("");
  const [vatIncluded, setVatIncluded] = useState(false);
  const [picking, setPicking] = useState<PartCategory | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchAllParts(), fetchTemplates().catch(() => [])])
      .then(([parts, tpls]) => {
        setAllParts(parts);
        setTemplates(tpls);
      })
      .catch(() => toast.error("부품 목록을 불러오지 못했습니다"))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (company?.contact) setCustomerName((v) => v || company.contact);
  }, [company]);

  /** 플랫폼을 바꾸면 그 플랫폼에 묶인 슬롯(CPU·마더보드)은 비운다 */
  const changePlatform = useCallback((next: PartPlatform) => {
    setPlatform(next);
    setSelection((prev) => {
      const copy = { ...prev };
      for (const cat of PLATFORM_BOUND) {
        const part = copy[cat];
        if (part && part.platform !== "common" && part.platform !== next) {
          delete copy[cat];
        }
      }
      return copy;
    });
  }, []);

  const partsFor = useCallback(
    (category: PartCategory) =>
      allParts.filter(
        (p) =>
          p.category === category &&
          (!PLATFORM_BOUND.includes(category) ||
            p.platform === platform ||
            p.platform === "common")
      ),
    [allParts, platform]
  );

  const issues = useMemo(() => checkCompatibility(selection), [selection]);
  const blocked = hasBlockingIssue(issues);
  const totals = useMemo(
    () => totalsFromSelection(selection, quantities, vatIncluded),
    [selection, quantities, vatIncluded]
  );

  /** 문제가 걸린 슬롯 — 행 강조용 */
  const flagged = useMemo(() => {
    const map = new Map<PartCategory, "error" | "warning">();
    for (const issue of issues) {
      for (const cat of issue.categories) {
        if (issue.level === "error" || !map.has(cat)) map.set(cat, issue.level);
      }
    }
    return map;
  }, [issues]);

  function pick(part: Part) {
    setSelection((prev) => ({ ...prev, [part.category]: part }));
    setPicking(null);
  }

  /**
   * 추천사양을 견적에 펼친다.
   * 통화 요청: "출전사항 1 2 3 정도 해 가지고 클릭하면" — 원클릭 구성.
   */
  function applyTemplate(template: QuoteTemplate) {
    const byId = new Map(allParts.map((p) => [p.id, p]));
    const next: Selection = {};
    const nextQty: Quantities = {};
    const missing: string[] = [];

    for (const item of template.items) {
      const part = byId.get(item.partId);
      if (!part) {
        missing.push(CATEGORY_META[item.category].label);
        continue;
      }
      next[item.category] = part;
      if (item.quantity > 1) nextQty[item.category] = item.quantity;
    }

    setPlatform(template.platform === "common" ? "amd" : template.platform);
    setSelection(next);
    setQuantities(nextQty);

    if (missing.length > 0) {
      // 부품이 비활성화·삭제되면 그 슬롯만 빈다. 조용히 넘어가지 않는다.
      toast.warning(
        `${template.name} 적용 — ${missing.join(", ")}는 현재 취급하지 않아 비워뒀습니다`
      );
    } else {
      toast.success(`${template.name} 구성을 불러왔습니다`);
    }
  }

  function clear(category: PartCategory) {
    setSelection((prev) => {
      const copy = { ...prev };
      delete copy[category];
      return copy;
    });
  }

  async function handleSave() {
    if (!customerName.trim()) {
      toast.error("주문자를 입력해주세요");
      return;
    }
    if (Object.keys(selection).length === 0) {
      toast.error("부품을 하나 이상 선택해주세요");
      return;
    }
    if (blocked) {
      toast.error("호환되지 않는 구성이 있습니다. 빨간 항목을 확인해주세요");
      return;
    }
    setSaving(true);
    try {
      const quote = await createQuote({
        platform,
        customerName: customerName.trim(),
        companyId: company?.id ?? null,
        createdBy: user?.id ?? null,
        vatIncluded,
        selection,
        quantities,
      });
      toast.success(`견적서 ${quote.displayNo} 생성됨`);
      router.push(`/quotes/${quote.displayNo}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "견적서 저장 실패");
      setSaving(false);
    }
  }

  if (!authorized) return null;

  return (
    <div className="mx-auto w-full max-w-[1280px] py-8 px-4 sm:px-6 md:px-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">견적 작성</h1>
          <p className="mt-1 text-sm text-text-secondary">
            부품을 선택하면 호환성과 금액이 자동으로 계산됩니다
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-secondary p-1">
          {(["amd", "intel"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => changePlatform(p)}
              className={`rounded-md px-5 py-2 text-sm font-semibold transition-colors ${
                platform === p
                  ? "bg-primary text-primary-foreground"
                  : "text-text-secondary hover:text-foreground"
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {!ready ? (
        <div className="flex items-center justify-center py-24 text-text-muted">
          <Loader2 className="mr-2 size-5 animate-spin" />
          부품 목록 불러오는 중…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* 슬롯 목록 */}
          <div className="flex flex-col gap-4">
            {templates.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                  <Sparkles className="size-4 text-primary" />
                  추천 사양
                  <span className="font-normal text-text-muted">
                    — 클릭하면 구성이 한 번에 채워집니다
                  </span>
                </h2>
                <div className="grid gap-2 sm:grid-cols-3">
                  {templates.map((t) => {
                    const sum = t.items.reduce((acc, i) => {
                      const p = allParts.find((x) => x.id === i.partId);
                      return acc + (p ? p.price * i.quantity : 0);
                    }, 0);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => applyTemplate(t)}
                        className="rounded-lg border border-border bg-secondary px-4 py-3 text-left transition-colors hover:border-primary"
                      >
                        <span className="block text-sm font-bold text-foreground">
                          {t.name}
                        </span>
                        {t.description && (
                          <span className="mt-0.5 block text-[12px] leading-snug text-text-muted">
                            {t.description}
                          </span>
                        )}
                        <span className="mt-1.5 block text-[13px] font-semibold text-primary">
                          {formatWon(sum)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-[13px] text-text-muted">
                  <th className="w-[130px] px-4 py-3 font-semibold">분류</th>
                  <th className="px-4 py-3 font-semibold">제품</th>
                  <th className="w-[70px] px-2 py-3 text-center font-semibold">수량</th>
                  <th className="w-[120px] px-4 py-3 text-right font-semibold">금액</th>
                  <th className="w-[44px] px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {CATEGORY_ORDER.map((cat) => {
                  const part = selection[cat];
                  const qty = quantities[cat] ?? 1;
                  const level = flagged.get(cat);
                  const meta = CATEGORY_META[cat];
                  const isGroupStart =
                    cat === "labor_as" || cat === "keyboard";

                  return (
                    <tr
                      key={cat}
                      className={`border-b border-border/60 last:border-0 ${
                        isGroupStart ? "border-t-2 border-t-border" : ""
                      } ${
                        level === "error"
                          ? "bg-red-500/5"
                          : level === "warning"
                            ? "bg-yellow-500/5"
                            : ""
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary">
                          {meta.label}
                          {level === "error" && (
                            <AlertTriangle className="size-3.5 text-red-400" />
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => setPicking(cat)}
                          className="w-full truncate text-left text-sm text-foreground hover:text-primary"
                        >
                          {part ? (
                            part.name
                          ) : (
                            <span className="text-text-muted">선택하세요</span>
                          )}
                        </button>
                      </td>
                      <td className="px-2 py-2.5">
                        {part && (
                          <Input
                            type="number"
                            min={1}
                            value={qty}
                            onChange={(e) =>
                              setQuantities((prev) => ({
                                ...prev,
                                [cat]: Math.max(1, Number(e.target.value) || 1),
                              }))
                            }
                            className="h-8 px-2 text-center text-[13px]"
                          />
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm font-medium text-foreground">
                        {part ? formatWon(part.price * qty) : "—"}
                      </td>
                      <td className="px-2 py-2.5">
                        {part && (
                          <button
                            type="button"
                            onClick={() => clear(cat)}
                            className="text-text-muted transition-colors hover:text-red-400"
                            aria-label={`${meta.label} 비우기`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>

          {/* 사이드바 */}
          <div className="flex flex-col gap-4">
            {/* 호환성 */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <ShieldCheck className="size-4 text-primary" />
                호환성 검증
              </h2>
              {issues.length === 0 ? (
                <p className="flex items-center gap-2 text-[13px] text-primary">
                  <Check className="size-4" />
                  문제 없음
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {issues.map((issue, i) => (
                    <li
                      key={i}
                      className={`rounded-lg border p-3 text-[13px] ${
                        issue.level === "error"
                          ? "border-red-500/40 bg-red-500/5"
                          : "border-yellow-500/40 bg-yellow-500/5"
                      }`}
                    >
                      <p
                        className={`font-semibold ${
                          issue.level === "error" ? "text-red-400" : "text-yellow-400"
                        }`}
                      >
                        {issue.level === "error" ? "✕ " : "! "}
                        {issue.message}
                      </p>
                      {issue.detail && (
                        <p className="mt-1 leading-relaxed text-text-secondary">
                          {issue.detail}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 금액 */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-bold text-foreground">금액</h2>
              <dl className="flex flex-col gap-2 text-[13px]">
                <div className="flex justify-between">
                  <dt className="text-text-secondary">본체 견적합계</dt>
                  <dd className="font-medium text-foreground">{formatWon(totals.core)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">공임 &amp; AS</dt>
                  <dd className="font-medium text-foreground">{formatWon(totals.service)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">주변기기</dt>
                  <dd className="font-medium text-foreground">
                    {formatWon(totals.peripheral)}
                  </dd>
                </div>
                <div className="mt-1 flex justify-between border-t border-border pt-2.5">
                  <dt className="font-bold text-foreground">총 합계</dt>
                  <dd className="text-lg font-extrabold text-primary">
                    {formatWon(totals.grand)}
                  </dd>
                </div>
                <div className="flex justify-between text-text-muted">
                  <dt>{vatIncluded ? "공급가액 (VAT 제외)" : "부가세 (별도)"}</dt>
                  <dd>{formatWon(vatIncluded ? totals.supply : totals.vat)}</dd>
                </div>
              </dl>
            </div>

            {/* 발행 정보 */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customer">주문자 *</Label>
                <Input
                  id="customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="예: 황종환센터장님"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-text-secondary">
                <Checkbox
                  checked={vatIncluded}
                  onCheckedChange={(v) => setVatIncluded(v === true)}
                />
                금액에 부가세 포함 (VAT 포함 견적)
              </label>

              <Button
                variant="cta"
                size="lg"
                onClick={handleSave}
                disabled={saving || blocked}
                className="w-full"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                견적서 발행
              </Button>
              {blocked && (
                <p className="flex items-start gap-1.5 text-[12px] text-red-400">
                  <X className="mt-0.5 size-3.5 shrink-0" />
                  호환되지 않는 구성이 있어 발행할 수 없습니다
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {picking && (
        <PartPicker
          category={picking}
          parts={partsFor(picking)}
          onPick={pick}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}
