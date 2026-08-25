"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";

import {
  clearPartImage,
  deletePart,
  setStock,
  templatesUsingPart,
  updatePartDetails,
  uploadPartImage,
  upsertPart,
} from "@/lib/db/parts";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  PLATFORM_BOUND,
  type Part,
  type PartCategory,
  type PartPlatform,
} from "@/lib/types";
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
import { PartImageCell } from "@/components/admin/part-image-cell";

/** "1,234원" 같은 표기도 받는다 — 엑셀에서 서식이 붙은 채로 나오기 때문 */
function parseWon(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return null;
  const n = Number(digits);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function agoLabel(iso: string | null): string {
  if (!iso) return "확인한 적 없음";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "오늘 확인";
  if (days === 1) return "어제 확인";
  return `${days}일 전 확인`;
}

/**
 * 부품 상세 편집.
 *
 * 추가와 수정을 한 화면으로 묶는다(part이 없으면 추가). 두 화면을 따로 두면 칸이
 * 어긋나고, 어차피 고치는 항목이 같다.
 *
 * 저장 경로가 갈리는 것은 이유가 있다. 추가는 (분류, 제품명) 자연키로 upsert해
 * 같은 이름을 또 넣어도 중복 행이 생기지 않게 하고, 수정은 id로 갱신한다 —
 * 자연키로 수정하면 이름을 고쳤을 때 원래 행 대신 새 행이 생긴다.
 */
export function PartEditorDialog({
  part,
  onClose,
  onSaved,
  onDeleted,
}: {
  /** null이면 새 부품 추가 */
  part: Part | null;
  onClose: () => void;
  onSaved: (saved: Part) => void;
  onDeleted?: (id: string) => void;
}) {
  const editing = !!part;

  const [form, setForm] = useState({
    category: (part?.category ?? "") as "" | PartCategory,
    platform: (part?.platform ?? "common") as PartPlatform,
    name: part?.name ?? "",
    price: part ? String(part.price) : "",
    listPrice: part?.listPrice != null ? String(part.listPrice) : "",
    partNo: part?.partNo != null ? String(part.partNo) : "",
    grade: part?.grade ?? "",
    link: part?.link ?? "",
    stock: part?.stock != null ? String(part.stock) : "",
    soldOut: part?.soldOut ?? false,
  });
  const [image, setImage] = useState<string | null>(part?.imageUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [busyImage, setBusyImage] = useState(false);

  const platformBound =
    !!form.category && PLATFORM_BOUND.includes(form.category as PartCategory);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleImage(file: File) {
    if (!part) return;
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 올릴 수 있습니다");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("5MB 이하 이미지만 올릴 수 있습니다");
      return;
    }
    setBusyImage(true);
    try {
      setImage(await uploadPartImage(part.id, file));
      toast.success("사진을 바꿨습니다");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "사진 업로드 실패");
    } finally {
      setBusyImage(false);
    }
  }

  async function handleClearImage() {
    if (!part) return;
    setBusyImage(true);
    try {
      await clearPartImage(part.id);
      setImage(null);
      toast.success("사진을 지웠습니다");
    } catch {
      toast.error("사진을 지우지 못했습니다");
    } finally {
      setBusyImage(false);
    }
  }

  async function save() {
    const price = parseWon(form.price);
    if (!form.category) return toast.error("분류를 선택해주세요");
    if (!form.name.trim()) return toast.error("제품명을 입력해주세요");
    if (price === null) return toast.error("판매가를 숫자로 입력해주세요");

    const fields = {
      partNo: form.partNo.trim() ? Number(form.partNo.replace(/[^\d]/g, "")) : null,
      category: form.category,
      platform: platformBound ? form.platform : ("common" as PartPlatform),
      name: form.name.trim(),
      price,
      listPrice: parseWon(form.listPrice),
      soldOut: form.soldOut,
      grade: form.grade.trim() || null,
      link: form.link.trim() || null,
    };

    setSaving(true);
    try {
      const saved = part
        ? await updatePartDetails(part.id, fields)
        : await upsertPart(fields);

      // 재고는 parts가 아니라 inventory에 있어 따로 저장한다
      const stock = form.stock.trim() === "" ? null : Number(form.stock);
      if (stock !== null && Number.isFinite(stock) && stock >= 0 && stock !== part?.stock) {
        await setStock(saved.id, stock);
        saved.stock = stock;
      }
      saved.imageUrl = image;

      toast.success(editing ? "저장했습니다" : "부품을 추가했습니다");
      onSaved(saved);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "저장 실패");
      setSaving(false);
    }
  }

  async function remove() {
    if (!part) return;
    let used: string[] = [];
    try {
      used = await templatesUsingPart(part.id);
    } catch {
      /* 조회 실패가 삭제를 막을 이유는 아니다 — 경고만 못 붙인다 */
    }
    const warn =
      used.length > 0 ? `\n\n주의: 추천 PC(${used.join(", ")})에서도 빠집니다.` : "";
    if (
      !window.confirm(
        `"${part.name}"을(를) 삭제할까요?${warn}\n\n이미 발행한 견적서는 그대로 남습니다.`
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      await deletePart(part.id);
      toast.success("삭제했습니다");
      onDeleted?.(part.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle>{editing ? "부품 상세" : "부품 추가"}</DialogTitle>
        </DialogHeader>

        {/* 본문만 스크롤한다 — 저장·삭제 버튼이 화면 밖으로 밀리면 안 된다 */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-1 pr-1">
          {/* 사진 — 추가할 때는 부품 id가 없어 올릴 수 없다 */}
          {editing && part && (
            <div className="flex items-center gap-4 rounded-lg border border-border bg-secondary/40 p-3">
              <PartImageCell
                part={{ ...part, imageUrl: image }}
                size={72}
                onPick={handleImage}
                onClear={handleClearImage}
              />
              <div className="min-w-0 text-[13px] text-text-secondary">
                <p className="font-semibold text-foreground">사진</p>
                <p className="mt-0.5">
                  {busyImage ? "올리는 중…" : "사진을 눌러 바꾸고, × 로 지웁니다 (5MB 이하)"}
                </p>
                <p className="mt-1 text-[12px] text-text-muted">
                  {agoLabel(part.priceCheckedAt)} · 판매가 기준
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>분류 *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => set("category", v as PartCategory)}
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
                onValueChange={(v) => set("platform", v as PartPlatform)}
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
              autoFocus={!editing}
              placeholder="예) AMD Ryzen™ 5 Vermeer 5600"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="grid gap-1.5">
              <Label>판매가 *</Label>
              <Input
                inputMode="numeric"
                placeholder="170000"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>정가</Label>
              <Input
                inputMode="numeric"
                placeholder="없으면 비움"
                value={form.listPrice}
                onChange={(e) => set("listPrice", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>재고</Label>
              <Input
                inputMode="numeric"
                placeholder="미등록"
                value={form.stock}
                onChange={(e) => set("stock", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>고유번호</Label>
              <Input
                inputMode="numeric"
                placeholder="선택"
                value={form.partNo}
                onChange={(e) => set("partNo", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-1.5">
              <Label>매입처 링크</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://www.compuzone.co.kr/..."
                  value={form.link}
                  onChange={(e) => set("link", e.target.value)}
                />
                {form.link.trim() && (
                  <Button variant="outline" size="icon" asChild title="새 탭에서 열기">
                    <a href={form.link} target="_blank" rel="noreferrer noopener">
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                )}
              </div>
              <p className="text-[11.5px] text-text-muted">
                컴퓨존 링크를 넣어두면 가격 갱신 대상이 됩니다
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label>등급</Label>
              <Input
                className="sm:w-[110px]"
                placeholder="RC_A"
                value={form.grade}
                onChange={(e) => set("grade", e.target.value)}
              />
            </div>
          </div>

          <label className="flex w-fit cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2">
            <input
              type="checkbox"
              checked={form.soldOut}
              onChange={(e) => set("soldOut", e.target.checked)}
              className="size-4 cursor-pointer accent-yellow-500"
            />
            <span className="text-[13px] text-text-secondary">
              공급사 품절 — 견적에서 경고가 붙습니다
            </span>
          </label>
        </div>

        <DialogFooter className="mt-4 shrink-0 gap-2 border-t border-border pt-4 sm:justify-between">
          {editing ? (
            <Button
              variant="outline"
              onClick={remove}
              disabled={saving}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
              삭제
            </Button>
          ) : (
            <span />
          )}
          <span className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              취소
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              저장
            </Button>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
