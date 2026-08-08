"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { submitInquiry, type InquiryDraft } from "@/lib/db/inquiries";
import type { InquiryKind } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * 견적 요청 폼. 두 방향(매입·판매)이 연락처·수량·비고를 공유하므로
 * 공통 뼈대를 여기 두고, 방향별로 다른 질문만 slot으로 받는다.
 *
 * 로그인은 요구하지 않는다 — 견적 문의는 아직 우리를 고를지 정하지 않은
 * 사람이 쓰는 화면이라, 가입을 먼저 시키면 그 자리에서 이탈한다.
 */

export interface ExtraField {
  id: string;
  label: string;
  /** select면 옵션 목록, 없으면 숫자 입력 */
  options?: { value: string; label: string }[];
  placeholder?: string;
  suffix?: string;
}

export function InquiryForm({
  kind,
  extras,
  submitLabel,
  doneNote,
  doneCta,
}: {
  kind: InquiryKind;
  extras: ExtraField[];
  submitLabel: string;
  /** 접수 완료 후 안내 한 줄 */
  doneNote: string;
  /** 접수 후 이어서 할 행동 — 방향마다 다르다 */
  doneCta?: { href: string; label: string };
}) {
  const { user, company } = useAuth();

  const [form, setForm] = useState({
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    companyName: "",
    quantity: "",
    note: "",
  });
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<string | null>(null);

  // 로그인 상태면 아는 값은 채워둔다 — 다시 묻지 않는다
  const [prefilled, setPrefilled] = useState(false);
  if (!prefilled && (user || company)) {
    setPrefilled(true);
    setForm((f) => ({
      ...f,
      contactName: f.contactName || company?.contact || user?.name || "",
      contactPhone: f.contactPhone || company?.phone || "",
      contactEmail: f.contactEmail || user?.email || "",
      companyName: f.companyName || company?.name || "",
    }));
  }

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("수량을 입력해주세요");
      return;
    }

    setBusy(true);
    try {
      const draft: InquiryDraft = {
        kind,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail || undefined,
        companyName: form.companyName || undefined,
        quantity,
        note: form.note || undefined,
      };

      // 방향별 추가 질문을 해당 컬럼에 싣는다
      if (kind === "sell_to_us") {
        draft.specLevel = extraValues.specLevel;
        draft.purchasePeriod = extraValues.purchasePeriod;
      } else {
        draft.purpose = extraValues.purpose;
        const budget = Number(extraValues.budgetPerUnit);
        if (Number.isFinite(budget) && budget > 0) draft.budgetPerUnit = budget;
      }

      setIssued(await submitInquiry(draft));
    } catch {
      toast.error("접수에 실패했습니다. 잠시 후 다시 시도해주세요");
    } finally {
      setBusy(false);
    }
  }

  if (issued) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto mb-4 size-10 text-primary" />
        <h2 className="mb-2 text-[19px] font-bold text-foreground">
          견적 요청이 접수됐습니다
        </h2>
        <p className="mb-1 font-mono text-[14px] text-primary">{issued}</p>
        <p className="mb-7 text-[13px] leading-relaxed text-text-secondary">
          {doneNote}
        </p>
        <div className="flex flex-col justify-center gap-2.5 sm:flex-row">
          {doneCta && (
            <Button asChild variant="cta">
              <Link href={doneCta.href}>
                {doneCta.label} <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/">홈으로</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 md:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="담당자 이름" required>
          <Input
            value={form.contactName}
            onChange={(e) => set("contactName")(e.target.value)}
            placeholder="홍길동"
            required
            disabled={busy}
          />
        </Field>
        <Field label="연락처" required>
          <Input
            value={form.contactPhone}
            onChange={(e) => set("contactPhone")(e.target.value)}
            placeholder="010-0000-0000"
            inputMode="tel"
            required
            disabled={busy}
          />
        </Field>
        <Field label="회사명">
          <Input
            value={form.companyName}
            onChange={(e) => set("companyName")(e.target.value)}
            placeholder="주식회사 우주시스템"
            disabled={busy}
          />
        </Field>
        <Field label="이메일">
          <Input
            type="email"
            value={form.contactEmail}
            onChange={(e) => set("contactEmail")(e.target.value)}
            placeholder="you@company.com"
            disabled={busy}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="수량" required>
          <div className="relative">
            <Input
              value={form.quantity}
              onChange={(e) =>
                set("quantity")(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="25"
              inputMode="numeric"
              required
              disabled={busy}
              className="pr-10"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-text-muted">
              대
            </span>
          </div>
        </Field>

        {extras.map((f) => (
          <Field key={f.id} label={f.label}>
            {f.options ? (
              <Select
                value={extraValues[f.id] ?? ""}
                onValueChange={(v) =>
                  setExtraValues((s) => ({ ...s, [f.id]: v }))
                }
                disabled={busy}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {f.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="relative">
                <Input
                  value={extraValues[f.id] ?? ""}
                  onChange={(e) =>
                    setExtraValues((s) => ({
                      ...s,
                      [f.id]: e.target.value.replace(/[^0-9]/g, ""),
                    }))
                  }
                  placeholder={f.placeholder}
                  inputMode="numeric"
                  disabled={busy}
                  className={f.suffix ? "pr-10" : undefined}
                />
                {f.suffix && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-text-muted">
                    {f.suffix}
                  </span>
                )}
              </div>
            )}
          </Field>
        ))}
      </div>

      <Field label="남기실 말씀">
        <Textarea
          value={form.note}
          onChange={(e) => set("note")(e.target.value)}
          placeholder={
            kind === "sell_to_us"
              ? "모델명이나 상태를 아시면 적어주세요. 몰라도 괜찮습니다."
              : "꼭 필요한 사양이나 납기가 있으면 적어주세요."
          }
          rows={3}
          disabled={busy}
        />
      </Field>

      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] text-text-muted">
          접수 후 담당자가 영업일 기준 1일 안에 연락드립니다.
        </p>
        <Button type="submit" variant="cta" size="lg" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>
        {label}
        {required && <span className="ml-1 text-primary">*</span>}
      </Label>
      {children}
    </div>
  );
}
