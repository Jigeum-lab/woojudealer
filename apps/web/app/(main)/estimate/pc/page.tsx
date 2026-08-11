"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { fetchPublicParts } from "@/lib/db/parts";
import { submitInquiry } from "@/lib/db/inquiries";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  PLATFORM_BOUND,
  type InquiryBuild,
  type Part,
  type PartCategory,
  type PartGroup,
  type PartPlatform,
} from "@/lib/types";
import { checkCompatibility, hasBlockingIssue } from "@/lib/quote/compatibility";
import { totalsFromSelection } from "@/lib/quote/totals";
import { formatWon } from "@/lib/format";
import { PartImage } from "@/components/inquiry/part-image";
import {
  clearBuild,
  loadBuild,
  saveBuild,
  type StoredBuild,
} from "@/components/inquiry/build-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * 고객용 견적 구성기.
 *
 * 관리자 견적서(/quotes/new)와 같은 부품·호환성 규칙을 쓰되, 여기서는 견적서를
 * 발행하지 않는다. 고객이 담은 사양을 문의로 보내고 관리자가 받아 확정한다.
 * 그래서 매입처 링크·재고처럼 내부용 정보는 public_parts 뷰에서 아예 빠진다.
 *
 * 로그인은 요구하지 않는다. 대신 담은 내용은 localStorage에 남겨 다시 들어와도
 * 이어서 고를 수 있게 한다.
 */

type Selection = Partial<Record<PartCategory, Part>>;
type Quantities = Partial<Record<PartCategory, number>>;

const GROUP_LABEL: Record<PartGroup, string> = {
  core: "본체",
  service: "공임 & AS",
  peripheral: "주변기기 (선택)",
};

const GROUP_ORDER: PartGroup[] = ["core", "service", "peripheral"];

/** 최소한 이건 골라야 견적이 성립한다 */
const REQUIRED: PartCategory[] = ["cpu", "mainboard", "memory", "psu", "case"];

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
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-muted">
              검색 결과가 없습니다
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {filtered.map((part) => (
                <li key={part.id}>
                  <button
                    type="button"
                    onClick={() => onPick(part)}
                    className="flex w-full items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary"
                  >
                    <PartImage
                      src={part.imageUrl}
                      alt={part.name}
                      category={part.category}
                      size={56}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {part.name}
                      </span>
                      {part.soldOut && (
                        <Badge
                          variant="outline"
                          className="mt-1 border-yellow-500/40 text-[11px] text-yellow-400"
                        >
                          품절 — 입고 확인 필요
                        </Badge>
                      )}
                    </span>
                    <span className="shrink-0 text-sm font-bold text-foreground">
                      {formatWon(part.price)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BuildEstimatePage() {
  const { user, company } = useAuth();

  const [allParts, setAllParts] = useState<Part[]>([]);
  const [ready, setReady] = useState(false);
  const [platform, setPlatform] = useState<PartPlatform>("amd");
  const [selection, setSelection] = useState<Selection>({});
  const [quantities, setQuantities] = useState<Quantities>({});
  const [picking, setPicking] = useState<PartCategory | null>(null);
  const [restored, setRestored] = useState(false);

  const [showContact, setShowContact] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<string | null>(null);

  // 부품을 받은 뒤에야 저장된 id를 실제 부품으로 되살릴 수 있다
  useEffect(() => {
    fetchPublicParts()
      .then((parts) => {
        setAllParts(parts);
        const saved: StoredBuild | null = loadBuild();
        if (saved) {
          const byId = new Map(parts.map((p) => [p.id, p]));
          const revived: Selection = {};
          for (const [cat, id] of Object.entries(saved.picks)) {
            const part = id ? byId.get(id) : undefined;
            if (part) revived[cat as PartCategory] = part;
          }
          setPlatform(saved.platform);
          setSelection(revived);
          setQuantities(saved.quantities);
        }
      })
      .catch(() => toast.error("부품 목록을 불러오지 못했습니다"))
      .finally(() => {
        setReady(true);
        setRestored(true);
      });
  }, []);

  // 복원이 끝난 뒤부터 저장한다 — 안 그러면 빈 상태가 먼저 덮어쓴다
  useEffect(() => {
    if (!restored) return;
    const picks: StoredBuild["picks"] = {};
    for (const [cat, part] of Object.entries(selection)) {
      if (part) picks[cat as PartCategory] = part.id;
    }
    saveBuild({ platform, picks, quantities });
  }, [restored, platform, selection, quantities]);

  // 로그인 상태면 아는 값은 채워둔다
  const [prefilled, setPrefilled] = useState(false);
  if (!prefilled && (user || company)) {
    setPrefilled(true);
    setForm((f) => ({
      ...f,
      name: f.name || company?.contact || user?.name || "",
      phone: f.phone || company?.phone || "",
      email: f.email || user?.email || "",
    }));
  }

  const changePlatform = useCallback((next: PartPlatform) => {
    setPlatform(next);
    // 플랫폼이 바뀌면 거기 묶인 슬롯(CPU·마더보드)은 비운다
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
    () => totalsFromSelection(selection, quantities, false),
    [selection, quantities]
  );

  const pickedCount = Object.keys(selection).length;
  const missing = REQUIRED.filter((c) => !selection[c]);

  function reset() {
    setSelection({});
    setQuantities({});
    clearBuild();
    toast.success("구성을 비웠습니다");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const items = Object.values(selection)
        .filter((p): p is Part => Boolean(p))
        .map((p) => ({
          category: p.category,
          partNo: p.partNo,
          name: p.name,
          price: p.price,
          qty: quantities[p.category] ?? 1,
        }));

      const build: InquiryBuild = { platform, items, total: totals.grand };

      const no = await submitInquiry({
        kind: "buy_from_us",
        contactName: form.name,
        contactPhone: form.phone,
        contactEmail: form.email || undefined,
        quantity: 1,
        note: form.note || undefined,
        budgetPerUnit: totals.grand || undefined,
        build,
      });
      setIssued(no);
      clearBuild();
    } catch {
      toast.error("접수에 실패했습니다. 잠시 후 다시 시도해주세요");
    } finally {
      setBusy(false);
    }
  }

  if (issued) {
    return (
      <div className="mx-auto w-full max-w-[640px] px-4 py-20 sm:px-6">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 size-10 text-primary" />
          <h1 className="mb-2 text-[19px] font-bold text-foreground">
            견적 요청이 접수됐습니다
          </h1>
          <p className="mb-1 font-mono text-[14px] text-primary">{issued}</p>
          <p className="mb-7 text-[13px] leading-relaxed text-text-secondary">
            담아주신 사양 그대로 확인해서 정식 견적서를 보내드립니다. 품절 부품이
            있으면 같은 급으로 대체안을 함께 드립니다.
          </p>
          <Button asChild variant="outline">
            <Link href="/">홈으로</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-32 pt-10 sm:px-6 md:px-10 lg:pb-10">
      <Link
        href="/estimate"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> 견적 요청
      </Link>

      <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.18em] text-text-muted">
        견적 구성
      </p>
      <h1 className="mb-4 text-[28px] font-black leading-tight tracking-[-0.02em] text-foreground md:text-[34px]">
        직접 골라보세요
      </h1>
      <p className="mb-4 max-w-[620px] text-[15px] leading-relaxed text-text-secondary">
        부품을 담으면 호환성과 금액이 바로 계산됩니다. 조립되지 않는 구성은 요청
        단계에서 막습니다. 가입하지 않아도 되고, 담아둔 구성은 나갔다 오셔도
        그대로 있습니다.
      </p>
      <p className="mb-9 text-[13.5px] text-text-muted">
        직접 고르기 번거로우시면{" "}
        <Link
          href="/estimate/buy"
          className="font-semibold text-text-secondary underline underline-offset-4 transition-colors hover:text-primary"
        >
          용도·예산만 남기기
        </Link>
        도 됩니다.
      </p>

      {!ready ? (
        <div className="flex items-center gap-2 py-20 text-text-muted">
          <Loader2 className="size-5 animate-spin" /> 부품 목록을 불러오는 중…
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* 구성 */}
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2">
              {(["amd", "intel"] as PartPlatform[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => changePlatform(p)}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
                    platform === p
                      ? "bg-primary text-primary-foreground"
                      : "text-text-secondary hover:bg-secondary"
                  }`}
                >
                  {p === "amd" ? "AMD" : "Intel"}
                </button>
              ))}
            </div>

            {GROUP_ORDER.map((group) => {
              const cats = CATEGORY_ORDER.filter(
                (c) => CATEGORY_META[c].group === group
              );
              return (
                <div key={group} className="rounded-xl border border-border bg-card">
                  <div className="border-b border-border px-5 py-3">
                    <h2 className="text-[13px] font-bold text-text-secondary">
                      {GROUP_LABEL[group]}
                    </h2>
                  </div>
                  <ul className="divide-y divide-border/60">
                    {cats.map((cat) => {
                      const part = selection[cat];
                      const flagged = issues.some((i) => i.categories.includes(cat));
                      return (
                        <li
                          key={cat}
                          className={`flex items-center gap-3 px-5 py-3 ${
                            flagged ? "bg-destructive/5" : ""
                          }`}
                        >
                          <span className="w-[86px] shrink-0 text-[13px] text-text-muted">
                            {CATEGORY_META[cat].label}
                          </span>

                          {part && (
                            <PartImage
                              src={part.imageUrl}
                              alt={part.name}
                              category={cat}
                              size={44}
                            />
                          )}

                          <button
                            type="button"
                            onClick={() => setPicking(cat)}
                            className="min-w-0 flex-1 text-left"
                          >
                            {part ? (
                              <span className="block truncate text-[13.5px] font-medium text-foreground">
                                {part.name}
                              </span>
                            ) : (
                              <span className="text-[13.5px] text-text-muted">
                                선택하기
                              </span>
                            )}
                          </button>

                          {part && (
                            <>
                              <span className="shrink-0 font-mono text-[13px] text-foreground">
                                {formatWon(part.price)}
                              </span>
                              <button
                                type="button"
                                aria-label={`${CATEGORY_META[cat].label} 비우기`}
                                onClick={() =>
                                  setSelection((prev) => {
                                    const copy = { ...prev };
                                    delete copy[cat];
                                    return copy;
                                  })
                                }
                                className="shrink-0 text-text-muted transition-colors hover:text-destructive"
                              >
                                <X className="size-4" />
                              </button>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* 요약 */}
          <div className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-24 lg:w-[380px]">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[13px] font-bold text-text-secondary">
                  구성 요약
                </h2>
                {pickedCount > 0 && (
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-1 text-[12px] text-text-muted transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" /> 비우기
                  </button>
                )}
              </div>

              {pickedCount === 0 ? (
                <p className="py-6 text-center text-[13px] text-text-muted">
                  아직 담은 부품이 없습니다
                </p>
              ) : (
                <dl className="space-y-2 border-b border-border pb-4 text-[13px]">
                  <Row label="본체" value={formatWon(totals.core)} />
                  {totals.service > 0 && (
                    <Row label="공임 & AS" value={formatWon(totals.service)} />
                  )}
                  {totals.peripheral > 0 && (
                    <Row label="주변기기" value={formatWon(totals.peripheral)} />
                  )}
                </dl>
              )}

              <div className="mt-4 flex items-center justify-between">
                <span className="text-[14px] font-bold text-foreground">합계</span>
                <span className="font-mono text-[22px] font-extrabold text-primary">
                  {formatWon(totals.grand)}
                </span>
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-text-muted">
                부가세 별도. 부품 시세와 재고에 따라 최종 금액은 달라질 수 있습니다.
              </p>
            </div>

            {/* 호환성 */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 text-[13px] font-bold text-text-secondary">
                호환성 검증
              </h2>
              {issues.length === 0 ? (
                <p className="flex items-center gap-2 text-[13px] text-primary">
                  <Check className="size-4 stroke-[3]" />
                  {pickedCount === 0 ? "부품을 담으면 검사합니다" : "이상 없습니다"}
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {issues.map((issue, i) => (
                    <li key={i} className="flex gap-2.5">
                      <AlertTriangle
                        className={`mt-0.5 size-4 shrink-0 ${
                          issue.level === "error"
                            ? "text-destructive"
                            : "text-status-pickup"
                        }`}
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-[13px] font-semibold ${
                            issue.level === "error"
                              ? "text-destructive"
                              : "text-status-pickup"
                          }`}
                        >
                          {issue.message}
                        </p>
                        {issue.detail && (
                          <p className="mt-0.5 font-mono text-[12px] leading-relaxed text-text-secondary">
                            {issue.detail}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 요청 */}
            {!showContact ? (
              <div className="rounded-xl border border-border bg-card p-5">
                <Button
                  variant="cta"
                  size="lg"
                  className="w-full"
                  disabled={blocked || missing.length > 0}
                  onClick={() => setShowContact(true)}
                >
                  견적 요청하기
                </Button>
                {blocked ? (
                  <p className="mt-3 text-[12.5px] text-destructive">
                    조립되지 않는 구성입니다. 위 호환성 항목을 먼저 해결해주세요.
                  </p>
                ) : missing.length > 0 ? (
                  <p className="mt-3 text-[12.5px] text-text-muted">
                    {missing.map((c) => CATEGORY_META[c].label).join(" · ")} 을(를)
                    고르면 요청할 수 있습니다.
                  </p>
                ) : null}
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-4 rounded-xl border border-primary/40 bg-card p-5"
              >
                <h2 className="text-[13px] font-bold text-text-secondary">
                  연락처만 남겨주세요
                </h2>
                <div className="grid gap-1.5">
                  <Label>담당자 이름 *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="홍길동"
                    required
                    disabled={busy}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>연락처 *</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="010-0000-0000"
                    inputMode="tel"
                    required
                    disabled={busy}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>이메일</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="you@company.com"
                    disabled={busy}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>남기실 말씀</Label>
                  <Input
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="납기나 요청사항이 있으면 적어주세요"
                    disabled={busy}
                  />
                </div>
                <Button type="submit" variant="cta" size="lg" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  이 구성으로 요청하기
                </Button>
                <button
                  type="button"
                  onClick={() => setShowContact(false)}
                  className="text-[12.5px] text-text-muted transition-colors hover:text-foreground"
                  disabled={busy}
                >
                  구성 더 고치기
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 좁은 화면 전용 하단 바 — lg에서는 오른쪽 요약이 sticky라 필요 없다 */}
      {pickedCount > 0 && !showContact && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-4 py-3 sm:px-6">
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] text-text-muted">
                합계 (VAT 별도) · {pickedCount}개 품목
              </div>
              <div className="font-mono text-[19px] font-extrabold text-primary">
                {formatWon(totals.grand)}
              </div>
            </div>
            <Button
              variant="cta"
              disabled={blocked || missing.length > 0}
              onClick={() => {
                setShowContact(true);
                window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
              }}
            >
              견적 요청
            </Button>
          </div>
          {(blocked || missing.length > 0) && (
            <p className="px-4 pb-2.5 text-[11.5px] text-text-muted sm:px-6">
              {blocked
                ? "조립되지 않는 구성입니다. 호환성 항목을 확인해주세요."
                : `${missing.map((c) => CATEGORY_META[c].label).join(" · ")} 선택 필요`}
            </p>
          )}
        </div>
      )}

      {picking && (
        <PartPicker
          category={picking}
          parts={partsFor(picking)}
          onPick={(part) => {
            setSelection((prev) => ({ ...prev, [picking]: part }));
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-mono text-foreground">{value}</dd>
    </div>
  );
}
