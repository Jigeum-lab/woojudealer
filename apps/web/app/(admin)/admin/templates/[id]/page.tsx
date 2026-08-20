"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, X } from "lucide-react";

import {
  fetchTemplate,
  removeTemplateItem,
  setTemplateItem,
  updateTemplate,
  type AdminTemplate,
} from "@/lib/db/templates";
import { fetchAllParts } from "@/lib/db/parts";
import { formatWon } from "@/lib/format";
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

/**
 * 추천 PC 편집.
 *
 * 카테고리 한 칸에 부품 하나다 — quote_template_items에 (template_id, category)
 * unique가 걸려 있다. 그래서 고르면 upsert, 비우면 delete로 끝난다.
 *
 * 저장 버튼을 따로 두지 않는다. 부품은 고르는 즉시, 이름·설명 같은 값은 포커스가
 * 빠질 때 저장한다. 운영 중에 단가·구성이 자주 바뀌는 화면이라 "저장 안 누르고
 * 나갔다"가 제일 흔한 사고다.
 */
export default function TemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [template, setTemplate] = useState<AdminTemplate | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchTemplate(id), fetchAllParts()])
      .then(([t, ps]) => {
        if (!alive) return;
        setTemplate(t);
        setParts(ps);
      })
      .catch(() => toast.error("불러오지 못했습니다"))
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [id]);

  const partById = useMemo(
    () => new Map(parts.map((p) => [p.id, p])),
    [parts]
  );

  /** 카테고리별 고를 수 있는 부품. CPU·메인보드만 플랫폼을 탄다. */
  const optionsFor = (category: PartCategory, platform: PartPlatform) =>
    parts.filter(
      (p) =>
        p.category === category &&
        (!PLATFORM_BOUND.includes(category) ||
          p.platform === platform ||
          p.platform === "common")
    );

  const total = template
    ? template.items.reduce(
        (sum, it) => sum + (partById.get(it.partId)?.price ?? 0) * it.quantity,
        0
      )
    : 0;

  async function patchMeta(patch: Parameters<typeof updateTemplate>[1]) {
    if (!template) return;
    const before = template;
    setTemplate({ ...template, ...patch } as AdminTemplate);
    setSaving(true);
    try {
      await updateTemplate(template.id, patch);
    } catch {
      setTemplate(before);
      toast.error("저장하지 못했습니다");
    } finally {
      setSaving(false);
    }
  }

  async function pickPart(category: PartCategory, partId: string) {
    if (!template) return;
    setSaving(true);
    try {
      if (partId === "") {
        await removeTemplateItem(template.id, category);
        setTemplate({
          ...template,
          items: template.items.filter((i) => i.category !== category),
        });
      } else {
        const existing = template.items.find((i) => i.category === category);
        const quantity = existing?.quantity ?? 1;
        await setTemplateItem(template.id, category, partId, quantity);
        setTemplate({
          ...template,
          items: [
            ...template.items.filter((i) => i.category !== category),
            { category, partId, quantity },
          ],
        });
      }
    } catch {
      toast.error("저장하지 못했습니다");
    } finally {
      setSaving(false);
    }
  }

  async function setQuantity(category: PartCategory, quantity: number) {
    if (!template || quantity < 1) return;
    const item = template.items.find((i) => i.category === category);
    if (!item) return;
    setSaving(true);
    try {
      await setTemplateItem(template.id, category, item.partId, quantity);
      setTemplate({
        ...template,
        items: template.items.map((i) =>
          i.category === category ? { ...i, quantity } : i
        ),
      });
    } catch {
      toast.error("저장하지 못했습니다");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted">
        <Loader2 className="mr-2 size-5 animate-spin" />
        불러오는 중…
      </div>
    );
  }

  if (!template) {
    return (
      <div className="px-4 py-24 text-center md:px-8">
        <p className="text-text-secondary">추천 PC를 찾을 수 없습니다.</p>
        <Link
          href="/admin/templates"
          className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
        >
          목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/templates"
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          추천 PC 목록
        </Link>
        <div className="flex items-center gap-3">
          {saving && (
            <span className="flex items-center gap-1.5 text-[12.5px] text-text-muted">
              <Loader2 className="size-3.5 animate-spin" />
              저장 중
            </span>
          )}
          <button
            type="button"
            onClick={() => patchMeta({ active: !template.active })}
            disabled={!template.active && template.items.length === 0}
            className={`rounded-lg px-3.5 py-1.5 text-[13px] font-bold transition-colors disabled:opacity-40 ${
              template.active
                ? "bg-brand-green-soft text-primary"
                : "bg-secondary text-text-muted"
            }`}
          >
            {template.active ? "노출 중" : "숨김"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* 기본 정보 */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              defaultValue={template.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== template.name) patchMeta({ name: v });
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">설명</Label>
            <Input
              id="description"
              placeholder="카드에 한 줄로 붙습니다"
              defaultValue={template.description ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim() || null;
                if (v !== template.description) patchMeta({ description: v });
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tag">탭 라벨</Label>
            <Input
              id="tag"
              placeholder="예: 게임용 · 비우면 전체 탭에만"
              defaultValue={template.tag ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim() || null;
                if (v !== template.tag) patchMeta({ tag: v });
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="platform">플랫폼</Label>
              <select
                id="platform"
                value={template.platform}
                onChange={(e) =>
                  patchMeta({ platform: e.target.value as PartPlatform })
                }
                className="h-9 rounded-lg border border-border bg-secondary px-3 text-[13px] text-foreground"
              >
                <option value="amd">AMD</option>
                <option value="intel">인텔</option>
                <option value="common">공용</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sort">정렬 순서</Label>
              <Input
                id="sort"
                type="number"
                defaultValue={template.sortOrder}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v !== template.sortOrder)
                    patchMeta({ sortOrder: v });
                }}
              />
            </div>
          </div>

          <div className="mt-1 border-t border-border pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[12.5px] text-text-muted">
                합계 (VAT 별도)
              </span>
              <span className="font-mono text-[19px] font-extrabold text-primary">
                {formatWon(total)}
              </span>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-text-muted">
              부품 단가를 고치면 이 금액과 랜딩 금액이 함께 바뀝니다.
            </p>
          </div>
        </div>

        {/* 부품 구성 */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-1 text-[15px] font-bold text-foreground">부품 구성</h2>
          <p className="mb-4 text-[12.5px] text-text-secondary">
            한 분류에 부품 하나입니다. 고르면 바로 저장됩니다.
          </p>

          <div className="flex flex-col gap-2">
            {CATEGORY_ORDER.map((category) => {
              const item = template.items.find((i) => i.category === category);
              const options = optionsFor(category, template.platform);
              if (options.length === 0 && !item) return null;

              return (
                <div
                  key={category}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 px-3 py-2"
                >
                  <span className="w-[84px] shrink-0 text-[12px] font-bold text-text-muted">
                    {CATEGORY_META[category].label}
                  </span>

                  <select
                    value={item?.partId ?? ""}
                    onChange={(e) => pickPart(category, e.target.value)}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-secondary px-2.5 text-[12.5px] text-foreground"
                  >
                    <option value="">— 없음 —</option>
                    {options.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {formatWon(p.price)}
                      </option>
                    ))}
                  </select>

                  {item && (
                    <>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          setQuantity(category, Number(e.target.value))
                        }
                        className="h-9 w-[68px] text-center text-[12.5px]"
                      />
                      <button
                        type="button"
                        onClick={() => pickPart(category, "")}
                        className="text-text-muted transition-colors hover:text-destructive"
                        aria-label="비우기"
                      >
                        <X className="size-4" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex justify-end">
            <Button variant="outline" onClick={() => router.push("/admin/templates")}>
              목록으로
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
