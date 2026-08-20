"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import {
  createTemplate,
  deleteTemplate,
  fetchAllTemplates,
  updateTemplate,
  type AdminTemplate,
} from "@/lib/db/templates";
import { fetchAllParts } from "@/lib/db/parts";
import { formatWon } from "@/lib/format";
import type { Part } from "@/lib/types";
import { Button } from "@/components/ui/button";

/**
 * 추천 PC 목록 — 랜딩 "고민되시면 이 중에 고르셔도 됩니다"에 뜨는 구성들.
 *
 * 합계는 저장하지 않고 부품 단가로 매번 계산한다. 스냅샷을 두면 단가를 고쳤을 때
 * 랜딩 금액과 어긋난다(랜딩의 public_templates 뷰도 같은 방식이다).
 */
export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [parts, setParts] = useState<Map<string, Part>>(new Map());
  const [ready, setReady] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const [ts, ps] = await Promise.all([fetchAllTemplates(), fetchAllParts()]);
    setTemplates(ts);
    setParts(new Map(ps.map((p) => [p.id, p])));
  }

  useEffect(() => {
    load()
      .catch(() => toast.error("추천 PC를 불러오지 못했습니다"))
      .finally(() => setReady(true));
  }, []);

  const total = (t: AdminTemplate) =>
    t.items.reduce(
      (sum, it) => sum + (parts.get(it.partId)?.price ?? 0) * it.quantity,
      0
    );

  async function handleCreate() {
    setCreating(true);
    try {
      const id = await createTemplate("새 추천 PC");
      router.push(`/admin/templates/${id}`);
    } catch {
      toast.error("만들지 못했습니다");
      setCreating(false);
    }
  }

  async function toggleActive(t: AdminTemplate) {
    if (!t.active && t.items.length === 0) {
      toast.error("부품을 먼저 담아주세요");
      return;
    }
    setBusyId(t.id);
    try {
      await updateTemplate(t.id, { active: !t.active });
      setTemplates((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, active: !x.active } : x))
      );
    } catch {
      toast.error("저장하지 못했습니다");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(t: AdminTemplate) {
    if (!confirm(`"${t.name}"을(를) 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setBusyId(t.id);
    try {
      await deleteTemplate(t.id);
      setTemplates((prev) => prev.filter((x) => x.id !== t.id));
      toast.success("삭제했습니다");
    } catch {
      toast.error("삭제하지 못했습니다");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">추천 PC</h1>
          <p className="mt-1 text-[13px] text-text-secondary">
            랜딩의 추천 사양 카드로 나갑니다. 노출을 끄면 랜딩에서 내려갑니다.
          </p>
        </div>
        <Button variant="cta" onClick={handleCreate} disabled={creating}>
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          새 추천 PC
        </Button>
      </div>

      {!ready ? (
        <div className="flex items-center justify-center py-24 text-text-muted">
          <Loader2 className="mr-2 size-5 animate-spin" />
          불러오는 중…
        </div>
      ) : templates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong bg-card p-10 text-center text-sm text-text-muted">
          아직 만든 추천 PC가 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-border text-left text-[13px] text-text-muted">
                <th className="w-[60px] px-4 py-3 text-center font-semibold">순서</th>
                <th className="px-4 py-3 font-semibold">이름</th>
                <th className="w-[110px] px-3 py-3 font-semibold">탭</th>
                <th className="w-[80px] px-3 py-3 text-center font-semibold">플랫폼</th>
                <th className="w-[80px] px-3 py-3 text-center font-semibold">품목</th>
                <th className="w-[140px] px-4 py-3 text-right font-semibold">합계</th>
                <th className="w-[90px] px-3 py-3 text-center font-semibold">노출</th>
                <th className="w-[60px] px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr
                  key={t.id}
                  className={`border-b border-border/60 last:border-0 ${
                    busyId === t.id ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-center text-[13px] text-text-muted">
                    {t.sortOrder}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/templates/${t.id}`}
                      className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
                    >
                      {t.name}
                    </Link>
                    {t.description && (
                      <p className="mt-0.5 truncate text-[12px] text-text-muted">
                        {t.description}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[13px] text-text-secondary">
                    {t.tag ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-center text-[12px] uppercase text-text-muted">
                    {t.platform}
                  </td>
                  <td className="px-3 py-3 text-center text-[13px] text-text-secondary">
                    {t.items.length}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[13px] font-bold text-primary">
                    {formatWon(total(t))}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => toggleActive(t)}
                      disabled={busyId === t.id}
                      className={`rounded-full px-2.5 py-1 text-[12px] font-bold transition-colors ${
                        t.active
                          ? "bg-brand-green-soft text-primary"
                          : "bg-secondary text-text-muted"
                      }`}
                    >
                      {t.active ? "노출 중" : "숨김"}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(t)}
                      disabled={busyId === t.id}
                      className="text-text-muted transition-colors hover:text-destructive"
                      aria-label="삭제"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
